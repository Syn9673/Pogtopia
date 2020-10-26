const SECRET = 'PBG892FXX982ABC*'

const decodeStr =
  (id, length, file, pos, encoded = false) => {
    if (!Buffer.isBuffer(file))
      throw new TypeError('File must be a buffer')

    if (!encoded)
      return file.toString('utf-8', pos, pos + length)
    else {
      let str = ''

      for (let i = 0; i < length; i++) {
        str += file.readUInt8(pos) ^ String.fromCharCode(
          SECRET[(i + id) % SECRET.length]
        )

        pos++
      }

      return str
    }
  }

const decode =
  (file) => {
    if (!Buffer.isBuffer(file))
      throw new TypeError('File must be a buffer')

    const meta  = {}
    const tiles = []

    let pos       = 0
    const version = file.readUInt16LE(pos)
    pos += 2

    const itemCount = file.readUInt32LE(pos)
    pos += 4

    for (let i = 0; i < itemCount; i++) {
      const tile = {}
      
      tile.id = file.readUInt32LE(pos)
      pos += 4

      if (tile.id !== i)
        throw new Error('Unordered items.dat found. Currently at ID:', i, 'Received ID:', tile.id)

      tile.editableType = file.readUInt8(pos)
      pos++

      tile.itemCategory = file.readUInt8(pos)
      pos++

      tile.actionType = file.readUInt8(pos)
      pos++

      tile.hitSoundType = file.readUInt8(pos)
      pos++

      let strLen = file.readUInt16LE(pos)
      pos += 2

      tile.name = decodeStr(tile.id, strLen, file, pos, true)
      pos += strLen

      strLen = file.readUInt16LE(pos)
      pos += 2

      tile.texture = decodeStr(null, strLen, file, pos)
      pos += strLen

      tile.textureHash = file.readUInt32LE(pos)
      pos += 4

      tile.itemKind = file.readUInt8(pos)
      pos++

      // skip val1
      pos += 4

      tile.textureX = file.readUInt8(pos)
      pos++

      tile.textureY = file.readUInt8(pos)
      pos++

      tile.spreadType = file.readUInt8(pos)
      pos++

      tile.isStripeyWallpaper = file.readUInt8(pos)
      pos++

      tile.collisionType = file.readUInt8(pos)
      pos++

      tile.breakHits = file.readUInt8(pos) / 6
      pos++

      tile.resetAfter = file.readUInt32LE(pos)
      pos += 4

      tile.clothingType = file.readUInt8(pos)
      pos++

      tile.rarity = file.readUInt16LE(pos)
      pos += 2

      tile.maxAmount = file.readUInt8(pos)
      pos++

      strLen = file.readUInt16LE(pos)
      pos += 2

      tile.extraFile = decodeStr(null, strLen, file, pos)
      pos += strLen

      tile.extraFileHash = file.readUInt32LE(pos)
      pos += 4

      tile.audioVolume = file.readUInt32LE(pos)
      pos += 4

      strLen = file.readUInt16LE(pos)
      pos += 2

      tile.petName = decodeStr(null, strLen, file, pos)
      pos += strLen

      strLen = file.readUInt16LE(pos)
      pos += 2

      tile.petPrefix = decodeStr(null, strLen, file, pos)
      pos += strLen

      strLen = file.readUInt16LE(pos)
      pos += 2

      tile.petSuffix = decodeStr(null, strLen, file, pos)
      pos += strLen

      strLen = file.readUInt16LE(pos)
      pos += 2

      tile.petAbility = decodeStr(null, strLen, file, pos)
      pos += strLen

      tile.seedBase = file.readUInt8(pos)
      pos++

      tile.seedOverlay = file.readUInt8(pos)
      pos++

      tile.treeBase = file.readUInt8(pos)
      pos++

      tile.treeLeaves = file.readUInt8(pos)
      pos++

      tile.seedColor = file.readUInt32LE(pos)
      pos += 4
      
      tile.seedColorOverlay = file.readUInt32LE(pos)
      pos += 4

      // ??
      pos += 4

      tile.growTime = file.readUInt32LE(pos)
      pos += 4

      // skip val2
      pos += 4

      tile.isRayman = file.readUInt16LE(pos)
      pos += 2

      strLen = file.readUInt16LE(pos)
      pos += 2
  
      tile.extraOptions = decodeStr(null, strLen, file, pos)
      pos += strLen

      strLen = file.readUInt16LE(pos)
      pos += 2
  
      tile.texture2 = decodeStr(null, strLen, file, pos)
      pos += strLen

      strLen = file.readUInt16LE(pos)
      pos += 2
  
      tile.extraOptions2 = decodeStr(null, strLen, file, pos)
      pos += strLen

      pos += 80
      if (version >= 11) {
        strLen = file.readUInt16LE(pos)
        pos += 2
  
        tile.punchOptions = decodeStr(null, strLen, file, pos)
        pos += strLen
      } else tile.punchOptions = ''

      tiles.push(tile)
    }

    meta.version   = version
    meta.itemCount = itemCount
    meta.tiles     = tiles

    return meta
  }

module.exports = {
  decode
}