#!/usr/bin/env node

'use strict'

// NATIVE
const path = require('path')

// PACKAGES
const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')

const { PORT = 3000 } = process.env

const [file, handle] = process.argv.slice(2)[0].split('.')

const app = express()
app.use(morgan('dev'))
app.disable('x-powered-by')
app.use(bodyParser.json())

const eventTpl = {
  resource: '/',
  path: '/',
  httpMethod: 'GET',
  requestContext: {
    resourcePath: '/',
    httpMethod: 'GET',
    path: '/'
  },
  headers: {},
  multiValueHeaders: {},
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  pathParameters: null,
  stageVariables: null,
  body: null,
  isBase64Encoded: false
}

const setHeaders = (res, headers) => {
  for (const h in headers) {
    res.header(h, headers[h])
  }
}

const headersToArray = headers => {
  const arrHeaders = {}
  for (const h in headers) {
    arrHeaders[h] = [headers[h]]
  }
  return arrHeaders
}

const callbacks = res => ({
  succeed: r => {
    setHeaders(res, r.headers)
    return res.status(r.statusCode).send(r.body)
  },
  fail: msg => res.status(500).send(msg)
})

const callback = (res, err, r) => {
  if (err) {
    res.status(500).send(err)
  } else {
    setHeaders(res, r.headers)
    res.status(r.statusCode).send(r.body)
  }
}

const clearModulesCache = () => {
  try {
    const files = Object.keys(require.cache)
    const toDelete = files.filter(f => !f.includes('node_module'))

    for (const m of toDelete) {
      delete require.cache[m]
    }
  } catch (e) {
    console.error(e)
  }
}

const getHandler = (file, handle) => {
  clearModulesCache()
  return require(path.join(__dirname, '../../../../', file))[handle]
}

app.use(async (req, res) => {

  const event = {
    ...eventTpl,
    resource: req.url,
    path: req.url,
    httpMethod: req.method,
    requestContext: {
      resourcePath: req.url,
      httpMethod: req.method,
      path: req.url
    },
    headers: req.headers,
    multiValueHeaders: headersToArray(req.headers),
    queryStringParameters: req.query,
    body: JSON.stringify(req.body)
  }

  try {
    const handler = getHandler(file, handle)
    const response = await handler(event, { ...callbacks(res) }, (err, r) => callback(res, err, r))
    if (!res._headerSent) {
      if (response.headers) {
        res.status(response.statusCode).send(response.body)
      } else {
        res.send(response)
      }
    }
  } catch (e) {
    if (e.message === 'Unauthorized') {
      res.status(401).send(e.message)
    } else if (e.message === 'Forbidden') {
      res.status(403).send(e.message)
    } else {
      res.status(500).send(JSON.stringify(e))
    }
  }
})

app.listen(PORT, '0.0.0.0')
console.info(`Running on http://localhost:${PORT}`)
