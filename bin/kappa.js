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
const handler = require(path.join(__dirname, '../../../../', file))[handle]

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
    res.status(500).send(msg)
  } else {
    setHeaders(res, r.headers)
    res.status(r.statusCode).send(r.body)
  }
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
    await handler(event, { ...callbacks(res) }, (err, r) => callback(res, err, r))
  } catch (e) {
    res.status(500).send(JSON.stringify(e))
  }
})

app.listen(PORT, '0.0.0.0')
console.info(`Running on http://localhost:${PORT}`)
