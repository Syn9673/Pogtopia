class CustomCache {
  constructor() {
    this.container = {}
  }

  set(key, val) {
    if (typeof key !== 'string')
      throw new TypeError('Key must be a string.')

    this.container[key] = val
  }

  get(key) {
    if (typeof key !== 'string')
      throw new TypeError('Key must be a string.')

    return this.container[key]
  }

  del(key) {
    if (typeof key !== 'string')
      throw new TypeError('Key must be a string.')

    delete this.container[key]
  }

  keys(pattern) {
    if (typeof pattern !== 'string')
      throw new TypeError('Pattern must be a string.')

    const keys = Object.keys(this.container)
    pattern = pattern.replace(
      new RegExp('\\*', 'g'),
      '\\w*?'
    )

    return keys.filter(
      key => key.match(
        new RegExp(pattern, "g")
      )
    )
  }
}

module.exports = CustomCache