const Redis = require('ioredis')

class Redis {
  constructor(...args) {
    this.cache = new Redis(...args)

    const keys = Object.keys(this.cache)
                        .filter(key => key !== 'set' && key !== 'get')
                      
    for (const key of keys) {
      console.log(key)
      this[key] = this.cache[key]
    }
  }

  async set(key, val) {
    try {
      val = JSON.stringify(val)
    } catch(err) {}

    await this.cache.set(key, val)
  }

  async get(key) {
    let result = await this.cache.get(key)

    try {
      result = JSON.parse(result)
    } catch(err) {}

    return result
  }
}