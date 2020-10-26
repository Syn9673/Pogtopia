const Redis = require('ioredis')

class CustomRedis extends Redis {
  constructor(...args) {
    super(...args)
  }

  async set(key, val) {
    try {
      val = JSON.stringify(val)
    } catch(err) {}

    await super.set(key, val)
  }

  async get(key) {
    let result = await super.get(key)

    try {
      result = JSON.parse(result)
    } catch(err) {}

    return result
  }
}

module.exports = CustomRedis