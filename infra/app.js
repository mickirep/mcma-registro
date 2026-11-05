// Infraestructura de eventos.mcmafinance.com — sitio estático del formulario de leads.
// Despliegue: cd infra && npx cdk deploy --profile <perfil-con-permisos>
const path = require('path');
const cdk = require('aws-cdk-lib');
const { Stack, RemovalPolicy, Duration, CfnOutput } = cdk;
const s3 = require('aws-cdk-lib/aws-s3');
const s3deploy = require('aws-cdk-lib/aws-s3-deployment');
const cloudfront = require('aws-cdk-lib/aws-cloudfront');
const origins = require('aws-cdk-lib/aws-cloudfront-origins');
const acm = require('aws-cdk-lib/aws-certificatemanager');
const route53 = require('aws-cdk-lib/aws-route53');
const targets = require('aws-cdk-lib/aws-route53-targets');

const DOMINIO = 'eventos.mcmafinance.com';
const ZONA = { hostedZoneId: 'Z08107052JOYWT3BOV2OC', zoneName: 'mcmafinance.com' };

class EventosStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const zona = route53.HostedZone.fromHostedZoneAttributes(this, 'Zona', ZONA);

    const cert = new acm.Certificate(this, 'Cert', {
      domainName: DOMINIO,
      validation: acm.CertificateValidation.fromDns(zona),
    });

    const bucket = new s3.Bucket(this, 'Sitio', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // /fintechday2026/ (o sin barra final) → /index.html. La raíz redirige al sitio principal.
    // Los archivos (con extensión) se sirven tal cual desde la raíz del bucket.
    const rutas = new cloudfront.Function(this, 'Rutas', {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var req = event.request;
  var uri = req.uri;
  if (uri === '/' || uri === '') {
    return { statusCode: 302, statusDescription: 'Found',
      headers: { location: { value: 'https://www.mcmafinance.com' } } };
  }
  var ultimo = uri.split('/').pop();
  if (ultimo.indexOf('.') === -1) req.uri = '/index.html';
  return req;
}`),
    });

    const encabezados = new cloudfront.ResponseHeadersPolicy(this, 'Seguridad', {
      securityHeadersBehavior: {
        strictTransportSecurity: { accessControlMaxAge: Duration.days(365), includeSubdomains: false, override: true },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
      },
      customHeadersBehavior: {
        customHeaders: [{ header: 'X-Robots-Tag', value: 'noindex, nofollow', override: true }],
      },
    });

    const dist = new cloudfront.Distribution(this, 'Cdn', {
      domainNames: [DOMINIO],
      certificate: cert,
      comment: 'McMa Finance - formulario de leads de eventos',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: encabezados,
        functionAssociations: [{ function: rutas, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }],
      },
    });

    // Sube el formulario e invalida la caché en cada despliegue.
    new s3deploy.BucketDeployment(this, 'Subir', {
      destinationBucket: bucket,
      sources: [s3deploy.Source.asset(path.join(__dirname, '..'), {
        exclude: ['infra', 'infra/**', '.git', '.git/**', '.playwright-mcp', '.playwright-mcp/**', 'PRODUCT.md', '*.md', '*.gs', '.gitignore', '.nojekyll'],
      })],
      cacheControl: [s3deploy.CacheControl.fromString('public, max-age=60')],
      distribution: dist,
      distributionPaths: ['/*'],
    });

    const destino = route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(dist));
    new route53.ARecord(this, 'A', { zone: zona, recordName: 'eventos', target: destino });
    new route53.AaaaRecord(this, 'AAAA', { zone: zona, recordName: 'eventos', target: destino });

    new CfnOutput(this, 'Url', { value: `https://${DOMINIO}/fintechday2026/?r=K7P2` });
  }
}

const app = new cdk.App();
new EventosStack(app, 'McmaEventos', {
  env: { account: '412373518521', region: 'us-east-1' },
  description: 'eventos.mcmafinance.com - formulario de leads (marketing)',
  tags: { proyecto: 'mcma-eventos', area: 'marketing' },
});
