const mongo = require('koa-mongo')
const Router = require('koa-router')
const admin = new Router({
  prefix: '/admin'
})
const config = require('../../config')
const utils = require('../../common/utils')
const siteService = require('../../service/site')

admin
.post('/init/save-site', async ctx => {
  const site = await siteService.get(ctx.mongo)
  if (site) {
    ctx.body = 'The site has been initial!'
    return
  }
  // sitename, admin, password, github
  const newSite = Object.assign({
    sitename: 'node-blog',
    admin: 'admin',
    password: 'admin',
    github: ''
  }, ctx.request.body)
  // encry password
  newSite.password = utils.encryPassword(newSite.password)

  // TODO: 需要判断新增成功
  await siteService.add(ctx.mongo, newSite)
  // 注册成功直接设置 cookie，不需要重新登录一遍
  const loginSuccess = await utils.login(ctx, ctx.request.body.admin, ctx.request.body.password)
  if (loginSuccess) {
    ctx.redirect('/admin')
  } else {
    ctx.redirect('/admin/login')
  }
})
.get('/init', async ctx => {
  let site = await siteService.get(ctx.mongo)
  if (site) {
    ctx.redirect('/admin')
  } else {
    site = {}
  }
  await ctx.render('admin.ejs', {
    pageTitle: site.sitename,
    staticUrl: {
      'admin.css': config.staticUrl['admin.css'],
      'admin.js': config.staticUrl['admin.js']
    }
  })
})
.get('/login', async ctx => {
  const site = await siteService.get(ctx.mongo)
  if (!site) {
    return ctx.redirect('/admin/init')
  }
  console.log(site)

  const isLogined = await utils.isLogin(ctx)
  if (isLogined) {
    ctx.redirect('/admin')
  } else {
    await ctx.render('admin.ejs', {
      pageTitle: site.sitename,
      staticUrl: {
        'admin.css': config.staticUrl['admin.css'],
        'admin.js': config.staticUrl['admin.js']
      }
    })
  }
})
.post('/login', async ctx => {
  const loginSuccess = await utils.login(ctx, ctx.request.body.username, ctx.request.body.password)
  if (loginSuccess) {
    ctx.redirect('/admin')
  } else {
    ctx.redirect('/admin/login')
  }
})
.get('/logout', async ctx => {
  ctx.cookies.set(config.cookieAuthKey, null)
  ctx.redirect('/admin/login')
})
.get('*', utils.LoginMiddleware, async (ctx, next) => {
  const site = await siteService.get(ctx.mongo)
  if (!site) {
    ctx.redirect('/admin/init')
  }
  delete site.password

  return await ctx.render('admin.ejs', {
    pageConfig: {
      site
    },
    pageTitle: site.sitename,
    staticUrl: {
      'admin.css': config.staticUrl['admin.css'],
      'admin.js': config.staticUrl['admin.js']
    }
  })
})

module.exports = admin