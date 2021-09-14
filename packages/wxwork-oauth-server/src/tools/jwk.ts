import jose = require('jose')

const {
  JWKS: { KeyStore },
} = jose
const keystore = new KeyStore()
// eslint-disable-next-line @typescript-eslint/no-floating-promises
Promise.all([
  keystore.generate('RSA', 2048, { use: 'sig' }),
  // keystore.generate('RSA', 2048, { use: 'enc' }),
  keystore.generate('EC', 'P-256', { use: 'sig' }),
  // keystore.generate('EC', 'P-256', { use: 'enc' }),
  keystore.generate('OKP', 'Ed25519', { use: 'sig' }),
]).then(function() {
  process.stdout.write(JSON.stringify(keystore.toJWKS(true), null, 2))
})
