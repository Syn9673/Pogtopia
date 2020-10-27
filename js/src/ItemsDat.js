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
        str += String.fromCharCode(
          file[pos] ^ SECRET.charCodeAt(
            (id + i) % SECRET.length
          )
        )

        pos++
      }

      return str
    }
  }

const decode =
  (data) => {
    const meta = {
      items: []
    }

    let mempos = 0;

    meta.version = data.readUIntLE(mempos, 2);
    mempos += 2;

    meta.itemCount = data.readUInt32LE(mempos);
    mempos += 4;

    for (let k = 0; k < meta.itemCount; k++) {
      const item = {};

      item.id = data.readIntLE(mempos, 4)
      mempos += 4;

      item.editableType = data[mempos]
      mempos += 1;

      item.itemCategory = data[mempos]
      mempos += 1;

      item.actionType = data[mempos]
      mempos += 1;

      item.hitSoundType = data[mempos];
      mempos += 1;

      const nameLength = data.readInt16LE(mempos);
      mempos += 2;

      item.name = decodeStr(item.id, nameLength, data, mempos, true)
      mempos += nameLength
        
      const textureLength = data.readInt16LE(mempos);
      mempos += 2;

      item.texture = decodeStr(item.id, textureLength, data, mempos)
      mempos += textureLength

      item.textureHash = data.readIntLE(mempos, 4);
      mempos += 4;

      item.itemKind = data[mempos];
      mempos += 1;

      // skip val 1
      mempos += 4;

      item.textureX = data[mempos];
      mempos += 1;

      item.textureY = data[mempos];
      mempos += 1;

      item.spreadType = data[mempos];
      mempos += 1;

      item.isStripeyWallpaper = data[mempos];
      mempos += 1;

      item.collisionType = data[mempos];
      mempos += 1;

      item.breakHits = data[mempos] / 6;
      mempos += 1;

      item.resetStateAfter = data.readIntLE(mempos, 4);
      mempos += 4;

      item.clothingType = data[mempos];
      mempos += 1;

      item.rarity = data.readIntLE(mempos, 2);
      mempos += 2;

      item.maxAmount = data[mempos];
      mempos += 1;

      const extraFileLength = data.readInt16LE(mempos);
      mempos += 2;

      item.extraFile = decodeStr(item.id, extraFileLength, data, mempos)
      mempos += extraFileLength

      item.extraFileHash = data.readIntLE(mempos, 4);
      mempos += 4;

      item.audioVolume = data.readIntLE(mempos, 4);
      mempos += 4;

      const petNameLength = data.readInt16LE(mempos);
      mempos += 2;

      item.petName = decodeStr(item.id, petNameLength, data, mempos)
      mempos += petNameLength

      const petPrefixLength = data.readInt16LE(mempos);
      mempos += 2;

      item.petPrefix = decodeStr(item.id, petPrefixLength, data, mempos)
       mempos += petPrefixLength

      const petSuffixLength = data.readInt16LE(mempos);
      mempos += 2;

      item.petSuffix = decodeStr(item.id, petSuffixLength, data, mempos)
      mempos += petSuffixLength

      const petAbilityLength = data.readInt16LE(mempos);
      mempos += 2;

      item.petAbility = decodeStr(item.id, petAbilityLength, data, mempos)
      mempos += petAbilityLength

      item.seedBase = data[mempos];
      mempos += 1;

      item.seedOverlay = data[mempos];
      mempos += 1;

      item.treeBase = data[mempos];
      mempos += 1;

      item.treeLeaves = data[mempos];
      mempos += 1;


      item.seedColor = data.readIntLE(mempos, 4);
      mempos += 4;

      item.seedOverlayColor = data.readIntLE(mempos, 4);
      mempos += 4;

      mempos += 4; /* Ingredients Ignored */

      item.growTime = data.readIntLE(mempos, 4);
      mempos += 4;

      // skip val2
      mempos += 2;

      item.isRayman = data.readIntLE(mempos, 2);
      mempos += 2;

      const extraOptionsLength = data.readInt16LE(mempos);
      mempos += 2;

      item.extraOptions = decodeStr(item.id, extraOptionsLength, data, mempos)
      mempos += extraOptionsLength

      const textureTwoLength = data.readInt16LE(mempos);
      mempos += 2;

      item.texture2 = decodeStr(item.id, textureTwoLength, data, mempos)
      mempos += textureTwoLength

      const extraOptionsTwoLength = data.readInt16LE(mempos);
      mempos += 2;

      item.extraOptions2 = decodeStr(item.id, extraOptionsTwoLength, data, mempos)
      mempos += extraOptionsTwoLength

      item.unknownOptions = data.slice(mempos, mempos + 80);
      mempos += 80;

      item.punchOptions = "";

      if (meta.version >= 11) {
        const punchOptionsLength = data.readInt16LE(mempos);
        mempos += 2;

        item.punchOptions = decodeStr(item.id, punchOptionsLength, data, mempos)
        mempos += punchOptionsLength
      }

      meta.items.push(item);
    }

    return meta;
  }

module.exports = {
  decode
}