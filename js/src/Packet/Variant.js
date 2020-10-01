const TankPacket = require("./TankPacket");
const VARIANT_TYPES = require("../Structs/VariantTypes");

const write4BytesToArr = (arr, int, isFloat = false) => {
  if (!isFloat) {
    arr.push(int & 0x000000ff);
    arr.push((int & 0x0000ff00) >> 8);
    arr.push((int & 0x00ff0000) >> 16);
    arr.push((int & 0xff000000) >> 24);
  } else {
    const floats = new Float32Array(1);
    floats[0] = int;

    const buffer = Buffer.from(floats.buffer);
    for (const byte of buffer) {
      arr.push(byte);
    }
  };
}

module.exports = class Variant {
  constructor(options, args) {
    this.options = {
      delay: options.delay ?? 0,
      netID: options.netID ?? -1
    };

    this.args = args;
  }

  parse() {
    return TankPacket.from({
      type: 0x1,                      // variant
      netID: this.options.netID,      // our netID
      itemInfo: this.options.delay,   // the delay in ms,
      extraData: () => {
        const bytes = [null];   // the reason it's an array is so that we don't have to resize the buffer.
        let index = 0;          // variants index are the same as array indexes.

        for (let i = 0; i < this.args.length; i++)
          switch (typeof this.args[i]) {
            case "string": {
              const str = this.args[i];
              const strLen = str.length;
              
              bytes.push(index);                // current index
              bytes.push(VARIANT_TYPES.STRING); // type of argument

              // write 4 bytes for the str len
              write4BytesToArr(bytes, strLen);

              for (let char of str)
                bytes.push(char.charCodeAt(0));

              index++;
              break;
            }

            case "number": {
              const num = this.args[i];

              bytes.push(index);                                             // current index
              bytes.push(num < 0 ? VARIANT_TYPES.INT : VARIANT_TYPES.UINT);  // type of argument

              // write the bytes, 4 bytes as well
              write4BytesToArr(bytes, num);

              index++;
              break;
            }

            case "object": {
              const floats = this.args[i].filter(i => typeof i === "number");
              bytes.push(index);

              if (!Array.isArray(floats) || floats.length < 1)
                bytes.push(VARIANT_TYPES.NONE);
              else {
                const type = VARIANT_TYPES[`FLOAT_${floats.length}`];
                bytes.push(type);

                for (const float of floats)
                  write4BytesToArr(bytes, float, true);
              }

              index++;
              break;
            }
          }

        bytes[0] = index;         // set the arg count

        return Buffer.from(bytes);
      }
    }).parse();
  }

  static from(options, ...args) {
    if (Array.isArray(options) || typeof options !== "object")
      args.unshift(options);

    if (!args) args = [];

    return new Variant(options, args);
  }
}