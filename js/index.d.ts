import { EventEmitter } from "events";
import IORedis from 'ioredis'
import * as Mongo from "mongodb";





/**
 * Options for the CDN to use
 */
interface CDNOptions {
  /**
   * The host site of the CDN
   */
  host: string

  /**
   * The url of the CDN
   */
  url: string
}






/**
 * The config for the server
 */
interface ServerConfig {
  /**
   * The port for the server to use
   */
  port: number

  /**
   * The options for the CDN
   */
  cdn?: CDNOptions

  /**
   * The path to the items.dat file
   */
  itemsDatFile: string

  /**
   * The location to save the server.dat file. Default is "/js/src/Data/server.dat" of the Pogtopia folder.
   */
  serverDatPath?: string
}






/**
 * A cache manager
 */
interface CacheManager {
  /**
   * Sets the value of a key to the cache
   * @param key The unique key of the value
   * @param val The value of that key
   */
  set: (key: string, val: any) => void

  /**
   * Fetches a value from the cache with a key
   * @param key The key to fetch
   */
  get: (key: string) => any

  /**
   * Deletes a key-value pair from the cache.
   * @param key The key to delete
   */
  del: (key: string) => void

  /**
   * Fetches keys that match with a pattern
   * @param pattern The pattern to match
   */
  keys: (pattern: string) => string[]
}






/**
 * Configuration for the database
 */
interface DatabaseConfig {
  /**
   * Your username at the mongodb database
   */
  user: string

  /**
   * Your password at the mongodb database
   */
  pass: string

  /**
   * The host to connect to for mongo
   */
  host?: string

  /**
   * The port associated with the host
   */
  port?: string
}






/**
 * The general configuration
 */
interface Config {
  /**
   * Server config
   */
  server: ServerConfig

  /**
   * Database Config
   */
  db: DatabaseConfig

  /**
   * Redis config
   */
  redis?: IORedis.RedisOptions

  /**
   * A custom function to calculate the size of the world packet to allocate, excluding the necessary data of a world. (Basically just for tiles)
   * @param tiles The tiles in the world
   */
  worldTilesSize?: (tiles: WorldTile[]) => number

  /**
   * A custom function to replace for world serialization. This gets called after the buffer size is determinded. The "packet" argument is a reference to the buffer to use. Take note that this is not called in a loop, this is only called once.
   * @param pos The starting position for writing to buffers, use this to keep track on the current position when writing to the buffer.
   * @param packet The world packet to modify
   * @param tiles The tiles in the world
   */
  worldSerializationCall?: (pos: number, packet: Buffer, tiles: WorldTile[]) => void

  /**
   * A custom funtion to replace world generation.
   * @param world The world object.
   * @param width The width of the world.
   * @param height The height of the world.
   */
  worldGenerator?: (world: World, width?: number, height?: number) => Promise<WorldData>

  /**
   * The cache handler to replace redis.
   */
  cache?: CacheManager
}






/**
 * Options for the TankPacket
 */
interface TankOptions {
  /**
   * The type of the Tank Packet
   */
  type: number

  /**
   * The netID that's associated with the packet
   */
  netID?: number

  /**
   * The target netID for the packet. Not the same with "netID"
   */
  targetNetID?: number

  /**
   * The state of the packet.
   */
  state?: number

  /**
   * The info of the item used (name should be changed) or the delay on when to execute the packet (in ms).
   */
  itemInfo?: number

  /**
   * The X position of a player. (float)
   */
  playerPosX?: number

  /**
   * The Y position of a player. (float)
   */
  playerPosY?: number

  /**
   * The speed of the player on the x-axis. (float)
   */
  playerSpeedX?: number

  /**
   * The speed of the player on the y-axis. (float)
   */
  playerSpeedY?: number

  /**
   * The X position of where the player punched.
   */
  playerPunchX?: number

  /**
   * The Y position of where the player punched.
   */
  playerPunchY?: number

  /**
   * A callback to be executed when adding Extra Data.
   */
  extraData?: () => Buffer
}






/**
 * Options for the Variant Packet
 */
interface VariantOptions {
  /**
   * The delay on when to execute the packet (in ms).
   */
  delay?: number

  /**
   * The netID associated with the Packet.
   */
  netID?: number
}






/**
 * A representation of an item in an inventory
 */
interface InventoryItem {
  /**
   * The id of the item
   */
  id: number

  /**
   * The amount of that item in the inventory
   */
  amount: number
}






/**
 * The inventory data of a peer
 */
interface PeerInventory {
  /**
   * The max slots of a peer's inventory
   */
  maxSize: number

  /**
   * The items in the inventory
   */
  items: InventoryItem[]
}






/**
 * Clothing of a peer
 */
interface PeerClothes {
  hair: number
  shirt: number
  pants: number
  face: number
  hand: number
  back: number
  mask: number
  necklace: number
  shoes: number
  ances: number
}






/**
 * The complete user data of a peer
 */
interface PeerData {
  /**
   * The connectID of a user
   */
  connectID?: number

  /**
   * A unique identifier for a peer, it would just be the username for non-guest accounts and rid for guest.
   */
  uid?: string

  /**
   * The password of a user
   */
  password?: string

  /**
   * The name to display for the user
   */
  displayName?: string

  /**
   * The user id of the user, not to be mixed with uid.
   */
  userID?: number

  /**
   * Whehter or not a player is a guest
   */
  isGuest?: boolean

  /**
   * The country of the player
   */
  country?: string

  /**
   * Current world of a player
   */
  currentWorld?: string

  /**
   * Position of a player on the x-axis
   */
  x?: number

  /**
   * Position of a player on the y-axis
   */
  y?: number

  /**
   * Whether or not each player has moved
   */
  hasMovedInWorld?: boolean;

  /**
   * Inventory data of each peer
   */
  inventory?: PeerInventory

  /**
   * A unique id for each account (optional, not used in server code)
   */
  stringID?: string

  /**
   * Clothing of a player
   */
  clothes?: PeerClothes

  /**
   * Skin color of a player
   */
  skinColor?: number

  /**
   * Email address of a peer
   */
  email?: string
}






/**
 * Items Dat buffers
 */
export interface ItemsDat {
  /**
   * The TankPacket to send when requesting `refresh_item_data`
   */
  packet: TankPacket

  /**
   * The contents of the items.dat file
   */
  content: Buffer

  /**
   * The hash of the items.dat file
   */
  hash: number

  /**
   * Metadata for the items.dat
   */
  meta?: ItemsDatMeta
}






/**
 * Mongodb collections
 */
interface Collections {
  players: Mongo.Collection,
  worlds: Mongo.Collection,
  server: Mongo.Collection
}






interface OnSuperMainArgs {
  arg3: string
  arg4: string
}





/**
 * Representation of a block of a world
 */
interface WorldTile {
  /**
   * The forground block
   */
  fg: number

  /**
   * The background block
   */
  bg: number

  /**
   * The position of the block on the X axis of the world
   */
  x: number

  /**
   * The position of the block on the Y axis of the world
   */
  y: number

  /**
   * Whether or not the block represents a door
   */
  isDoor?: boolean

  /**
   * Whehter or not the door is closed
   */
  doorClosed?: boolean

  /**
   * The label of the block
   */
  label?: string

  /**
   * The world destination of a block. (For doors)
   */
  doorDestination?: string

  /**
   * The amount of hits a block has taken
   */
  hitsTaken?: number

  /**
   * The date on when the breakHits shall reset. (You would have to implement it yourself.)
   */
  resetAfter?: number
}






/**
 * Data of a world
 */
interface WorldData {
  /**
   * Name of the world, all caps
   */
  name?: string

  /**
   * The width of the world
   */
  width?: number

  /**
   * The height of the world
   */
  height?: number

  /**
   * The amount of maximum tiles in the world
   */
  tileCount?: number

  /**
   * An array of tiles in the world
   */
  tiles?: WorldTile[]
}






/**
 * A type that describes what are the values that can be sent to a peer.
 */
export type SendableData = Buffer | TextPacket | TankPacket | Variant






/**
 * A class that represents a world
 */
export class World {
  /**
   * The server object
   */
  private server: Server

  /**
   * The world data
   */
  public data?: WorldData

  /**
   * Creates a new instances of the world class.
   * @param server The server object
   * @param data The world data
   */
  constructor(server: Server, data?: WorldData);

  /**
   * Creates a new instance of the world class.
   * @param server The server class
   * @param name The name of the world
   */
  public static create(server: Server, name: string): World;

  /**
   * Whether or not the world has it's data.
   */
  public hasData(): boolean;

  /**
   * Fetches the world data from the cache, or db if not present. This will set the `.data` property. This doesn't auto generate worlds if not present.
   * @param shouldGenerate Whether or not to auto generate a world if not present in cache or the database.
   */
  public fetch(shouldGenerate?: boolean): Promise<void>;
  
  /**
   * Generates a world, it will save to cache after generating
   */
  public generate(): Promise<void>;

  /**
   * Serilizes the world packet. Fetches automatically from either the cache or database, if not present. Will also try to generate the world.
   */
  public serialize(): Promise<TankPacket>;

  /**
   * Saves world data to cache
   */
  public saveToCache(): Promise<void>;

  /**
   * Saves world data to the database
   */
  public saveToDb(): Promise<void>;

  /**
   * Deletes the world from cache
   */
  public uncache(): Promise<void>;
}






/**
 * A class that represents the Server
 */
export class Server extends EventEmitter {
  /**
   * The configuration for the server
   */
  public config: Config

  /**
   * Our redis client
   */
  public cache: IORedis.Redis | CustomCache;

  /**
   * Items dat object
   */
  public items: ItemsDat;

  /**
   * MongoDB Collections
   */
  public collections: Collections;

  /**
   * The current avaiable user id
   */
  public availableUserID: number;

  /**
   * Creates a new instance of the Server class
   * @param config The configuration for the server
   */
  constructor(config: Config);

  /**
   * Fetches the CDN Data passed from the config
   */
  getCDN(): CDNOptions | null;

  /**
   * Reset the values of the server.dat file
   */
  public clearServerDat(): void;

  /**
   * Whether or not mongodb collections are in place
   */
  public hasCollections(): boolean;

  /**
   * Start the server
   */
  public start(): Promise<void>;

  /**
   * Pretty much a console.log but it's asynchronous
   * @param args The arguments to log, same as console.log.
   */
  public log(...args: any[]): Promise<void>;

  /**
   * Set the handler for a specific event
   * @param type The event to handle
   * @param callback The callback for that event
   */
  public setHandler(type: "connect" | "disconnect", callback: (peer: Peer) => void): void;

  /**
   * Set the handler for a specific event
   * @param type The event to handle
   * @param callback The callback for that event
   */
  public setHandler(type: "receive", callback: (peer: Peer, packet: Buffer) => void): void;

  /**
   * Set the items.dat to use, this will create the packet and the hash. Do not use if already set in server config.
   * @param file The items.dat file content
   */
  private setItemsDat(file: Buffer): void;

  /**
   * Converts a string packet data to map, this will split the `\n` and `|`.
   * @param packet The string packet
   */
  public stringPacketToMap(packet: Buffer): Map<string, string>;

  /**
   * Loops through each player in the cache
   * @param type The type to loop
   * @param callback The callback to run per element
   */
  public forEach(type: "player", callback: (peer: Peer) => void): Promise<void>;

  /**
   * Loops through each world in the cache
   * @param type The type to loop
   * @param callback The callback to run per element
   */
  public forEach(type: "world", callback: (world: World) => void): Promise<void>;

  /**
   * Finds players or worlds inside the database with a filter.
   * @param type The type to find
   * @param filter The filter for that data
   */
  public find(type: "player", filter: PeerData): Promise<PeerData[]>

  /**
   * Finds players or worlds inside the database with a filter.
   * @param type The type to find
   * @param filter The filter for that data
   */
  public find(type: "world", filter: WorldData): Promise<WorldData[]>

  /**
   * Sets the item metadata.
   * @param meta The metadata of the items
   */
  public setItemMeta(meta: ItemsDatMeta): void
}






/**
 * A class to represent a Variant Packet
 */
export class Variant {
  /**
   * The options for the Variant
   */
  public options: VariantOptions

  /**
   * The arguments for the Variant
   */
  public args: (string | number | number[])[]

  /**
   * Creates a new Variant
   * @param options The options for the Variant
   * @param args The arguments for the Variant
   */
  constructor(options: VariantOptions, args: (string | number | number[])[]);

  /**
   * Parse the Variant Packet, convert it to bytes.
   */
  public parse(): Buffer; 

  /**
   * Creates a new Variant Packet
   * @param options Options for the variant packet
   * @param args Arguments of the Variant packet
   */
  public static from(options: string | VariantOptions, ...args: (string|number|number[])[]): Variant;
}





/**
 * A class that represents a TextPacket
 */
export class TextPacket {
  /**
   * The type to use
   */
  public type: number

  /**
   * The text/string for it to contain
   */
  public text?: string

  /**
   * Creates a new Text Packet
   * @param type The type to use
   * @param text The text/string for it to contain
   */
  constructor(type: number, text?: string);

  /**
   * Converts a text or a packet to a TextPacket class
   * @param type The type to set for the packet
   * @param values The text to place to the packet
   */
  public static from(type?: number, ...values: string[]): TextPacket;
}






/**
 * A class that represents a TankPacket
 */
export class TankPacket {
  /**
   * The data for the TankPacket
   */
  public data: TankOptions

  /**
   * Creates a new instance of the TankPacket
   * @param data The data for the TankPacket
   */
  constructor(data: TankOptions);

  /**
   * Create a new TankPacket
   * @param data The options for the TankPacket or the Buffer to convert to a TankPacket
   */
  public static from(data: TankOptions | Buffer): TankPacket;

  /**
   * Parse the TankPacket to bytes
   */
  public parse(): Buffer;
}






/**
 * A class that represents a connected peer
 */
export class Peer {
  /**
   * The instance of the server
   */
  private server: Server

  /**
   * The user data of the peer
   */
  public data?: PeerData

  /**
   * Creates a new instance of the peer
   * @param {Server} server The instance of the server
   * @param {PeerData} data The user data of the peer
   */
  constructor(server: Server, data?: PeerData)

  /**
   * Creates a new player to be saved to the database. This will also set the `data` property of a peer
   * @param data The data of the peer to create
   * @param saveToCache Whether or not to save the data to cache as well
   */
  public create(data: PeerData, saveToCache?: boolean): Promise<void>;

  /**
   * Sends the packet to the peer
   * @param data The packet to send
   */
  public send(data: SendableData): void;

  /**
   * Sends multiple packets to a peer.
   * @param data The data to send. Not an array but argument parameters.
   */
  public send_multiple(...data: SendableData[]): void;

  /**
   * Disconnects a peer
   * @param type The type of disconnection.
   */
  public disconnect(type?: "later" | "now"): Promise<void>;

  /**
   * Request the login information from the peer. This will emit the "receive" event.
   */
  public requestLoginInformation(): void

  /**
   * Saves the player to the database.
   */
  public saveToDb(): Promise<void>;

  /**
   * Saves player data to the cache.
   */
  public saveToCache(): Promise<void>;

  /**
   * Check if proper player data is present.
   */
  public hasPlayerData(): boolean;

  /**
   * Whether or not a player is already in cache
   */
  public alreadyInCache(): Promise<boolean>;

  /**
   * Fetches the peer data from the cache or database
   * @param type Where to fetch the data
   */
  public fetch(type: "cache" | "db", filter?: PeerData): Promise<void>;

  /**
   * Joins a world
   * @param name The name of the world
   * @param isSuperMod Whether or not the player joining is a super mod.
   */
  public join(name: string, isSuperMod?: boolean): Promise<void>;

  /**
   * Plays an audio file.
   * @param file The name of the file
   * @param delay The delay, in ms on when to play.
   */
  public audio(file: string, delay?: number): void;

  /**
   * Sends the inventory packet
   */
  public inventory(): void;

  /**
   * Creates a new world class then returns it.
   * @param name The name of the world
   * @param fetchDataAfter Whether or not to auto-fetch the world data from either cache or the database.
   */
  public world(name?: string | boolean, fetchDataAfter?: boolean): World;

  /**
   * Returns the packet for clothing
   * @param silenced Whether or not to play the sfx when wearing clothes
   */
  public cloth_packet(silenced?: boolean): Variant;

  /**
   * Removes an item from the inventory
   * @param id The id of the item
   * @param amount The amount to remove
   */
  public remove_item_from_inventory(id: number, amount?: number): Promise<void>;

  /**
   * Adds an item from the inventory
   * @param id The id of the item
   * @param amount The amount to add
   */
  public add_item_to_inventory(id: number, amount?: number): Promise<void>;
}






interface HTTPOptions {
  serverIP?: string
  serverPort?: string | number
  httpsEnabled?: boolean
}






/**
 * The http server handler
 */
export const Http = {
  /**
   * Start the HTTP server
   * @param opts Options for the HTTP Server
   */
  start(opts?: HTTPOptions): void {}
}





/**
 * Message types for what Growtopia Sends, or what to send.
 */
export enum PacketMessageTypes {
  REQUEST_LOGIN_INFO  = 0x1,
  STRING              = 0x2,
  ACTION              = 0x3,
  TANK_PACKET         = 0x4
}






/**
 * Variant Argument Types
 */
export enum VariantTypes {
  NONE      = 0x0,
  FLOAT_1   = 0x1,
  STRING    = 0x2,
  FLOAT_2   = 0x3,
  FLOAT_3   = 0x4,
  UINT      = 0x5,
  INT       = 0x9
}






/**
 * Some constants for helping the server
 */
export const Constants = {
  /**
   * Server epoch, date when pogtopia started development
   */
  SERVER_EPOCH: 1597077000000n,

  /**
   * Default skin color for players
   */
  DEFAULT_SKIN: 0x8295C3FF,

  /**
   * Arguments for OnSuperMain
   */
  OnSuperMainArgs: {
    arg3: "cc.cz.madkite.freedom org.aqua.gg idv.aqua.bulldog com.cih.gamecih2 com.cih.gamecih com.cih.game_cih cn.maocai.gamekiller com.gmd.speedtime org.dax.attack com.x0.strai.frep com.x0.strai.free org.cheatengine.cegui org.sbtools.gamehack com.skgames.traffikrider org.sbtoods.gamehaca com.skype.ralder org.cheatengine.cegui.xx.multi1458919170111 com.prohiro.macro me.autotouch.autotouch com.cygery.repetitouch.free com.cygery.repetitouch.pro com.proziro.zacro com.slash.gamebuster",
    arg4: "proto=110|choosemusic=audio/mp3/about_theme.mp3|active_holiday=7|server_tick=61370149|clash_active=1|drop_lavacheck_faster=1|isPayingUser=1|usingStoreNavigation=1|enableInventoryTab=1|bigBackpack=1|"
  }
}






/**
 * A custom cache manager built-in for pogtopia
 */
export class CustomCache {
  private container: any

  /**
   * Create a new instance of the cache manager
   */
  constructor()
  
  /**
   * Sets the value of a key to the cache
   * @param key The unique key of the value
   * @param val The value of that key
   */
  public set: (key: string, val: any) => void

  /**
   * Fetches a value from the cache with a key
   * @param key The key to fetch
   */
  public get: (key: string) => any

  /**
   * Deletes a key-value pair from the cache.
   * @param key The key to delete
   */
  public del: (key: string) => void

  /**
   * Fetches keys that match with a pattern
   * @param pattern The pattern to match
   */
  public keys: (pattern: string) => string[]
}






/**
 * Items dat meta data and the items itself
 */
export interface ItemsDatMeta {
  version: number
  itemCount: number

  items: ItemDefinition[]
}






/**
 * Item definition for each item in the items.dat
 */
export interface ItemDefinition {
  id?: number

  editableType?: number
  itemCategory?: number
  actionType?: number
  hitSoundType?: number

  name?: string
  
  texture?: string
  textureHash?: number
  itemKind?: number

  itemVal?: number
  
  textureX?: number
  textureY?: number
  spreadType?: number
  isStripeyWallpaper?: number
  collisionType?: number

  breakHits?: number

  resetStateAfter?: number
  clothingType?: number
  blockType?: number
  growTime?: number
  rarity?: number
  maxAmount?: number
  extraFile?: string
  extraFileHash?: number
  audioVolume?: number

  petName?: string
  petPrefix?: string
  petSuffix?: string
  petAbility?: string

  seedBase?: number
  seedOverlay?: number
  treeBase?: number
  treeLeaves?: number

  seedColor?: number
  seedOverlayColor?: number
  isMultiFace?: number
  
  isRayman?: number
  
  extraOptions?: string
  texture2?: string
  extraOptions2?: string
  punchOptions?: string

  unknownOptions?: string
}






/**
 * Utilities for items.dat
 */
export const ItemsDatUtils = {
  /**
   * Decodes the items.dat file
   * @param file The content of the items.dat file
   */
  decode: (file: Buffer): ItemsDatMeta => {}
}