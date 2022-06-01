const serve = require('koa-static')
const Koa = require('koa')
const Router = require('@koa/router')
const Binance = require('node-binance-api')
const moment = require('moment')
require('dotenv').config()

const binance = new Binance().options({
  APIKEY: process.env.BINANCE_API_KEY,
  APISECRET: process.env.BINANCE_SECRET_KEY
})

let lastApiHit = moment()
let lastAssets = []

const updateAssets = async () => {
  if (moment().subtract(10, 'seconds') > lastApiHit) {
    try {
      const balances = await binance.balance()
      const ticker = await binance.prices()
      const assets = []
      Object.entries(balances).filter(
        ([key, val]) => {
          if (val.available > 0 || val.onOrder > 0) {
            if (key === 'USDT') {
              assets.push({
                currency: key,
                amount: (parseFloat(val.available) + parseFloat(val.onOrder)).toFixed(8),
                rate: '1.00000000',
                usd_amount: ((parseFloat(val.available) + parseFloat(val.onOrder))).toFixed(8),
              })

            } else if (ticker[`${key}USDT`]) {
              assets.push({
                currency: key,
                amount: (parseFloat(val.available) + parseFloat(val.onOrder)).toFixed(8),
                rate: (ticker[`${key}USDT`]),
                usd_amount: ((parseFloat(val.available) + parseFloat(val.onOrder)) * ticker[`${key}USDT`]).toFixed(8),
              })
            } else if (ticker[`${key}BUSD`]) {
              assets.push({
                currency: key,
                amount: (parseFloat(val.available) + parseFloat(val.onOrder)).toFixed(8),
                rate: (ticker[`${key}BUSD`]),
                usd_amount: ((parseFloat(val.available) + parseFloat(val.onOrder)) * ticker[`${key}BUSD`]).toFixed(8),
              })
            }
          }
        }
      )

      const usdSum = assets.map(
        item => item.usd_amount
      ).reduce(
        (lhs, rhs) => parseFloat(lhs) + parseFloat(rhs),
        0
      )

      assets.map(asset => {
        asset.percentage = ((parseFloat(asset.usd_amount)) / usdSum * 100).toFixed(2)
      })

      assets.sort((lhs, rhs) => {
        if (parseFloat(lhs.usd_amount) > parseFloat(rhs.usd_amount)) {
          return -1;
        }
        if (parseFloat(lhs.usd_amount) < parseFloat(rhs.usd_amount)) {
          return 1;
        }
        return 0;
      })
      lastAssets = assets
    } catch (err) {
      console.log(err)
    }
    lastApiHit = moment()
  }
}

/* ======================================================= */
/*                          Server                         */
/* ======================================================= */

const app = new Koa()
const router = new Router();

router.prefix('/api')

router.get('/', async (ctx, next) => {
  await updateAssets()
  ctx.body = lastAssets.map(asset => {
    return { currency: asset.currency, percentage: asset.percentage }
  })
});

router.get('/detailed', async (ctx, next) => {
  if (ctx.query.auth !== process.env.AUTH_TOKEN) {
    ctx.status = 401
    return
  }
  await updateAssets()
  ctx.body = lastAssets
});

app
  .use(router.routes())
  .use(router.allowedMethods());

app.use(serve(__dirname + '/public', { extensions: ['html', 'js'] }))

const port = parseInt(process.env.PORT) || 3000
app.listen(port);
console.log(`Binance Portfolio Dashboard listening on port ${port}`);
