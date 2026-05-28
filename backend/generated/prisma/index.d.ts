
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model OTPVerification
 * 
 */
export type OTPVerification = $Result.DefaultSelection<Prisma.$OTPVerificationPayload>
/**
 * Model Session
 * 
 */
export type Session = $Result.DefaultSelection<Prisma.$SessionPayload>
/**
 * Model Vehicle
 * 
 */
export type Vehicle = $Result.DefaultSelection<Prisma.$VehiclePayload>
/**
 * Model Location
 * 
 */
export type Location = $Result.DefaultSelection<Prisma.$LocationPayload>
/**
 * Model Route
 * 
 */
export type Route = $Result.DefaultSelection<Prisma.$RoutePayload>
/**
 * Model Place
 * 
 */
export type Place = $Result.DefaultSelection<Prisma.$PlacePayload>
/**
 * Model PlaceReview
 * 
 */
export type PlaceReview = $Result.DefaultSelection<Prisma.$PlaceReviewPayload>
/**
 * Model PlacePhoto
 * 
 */
export type PlacePhoto = $Result.DefaultSelection<Prisma.$PlacePhotoPayload>

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs>;

  /**
   * `prisma.oTPVerification`: Exposes CRUD operations for the **OTPVerification** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more OTPVerifications
    * const oTPVerifications = await prisma.oTPVerification.findMany()
    * ```
    */
  get oTPVerification(): Prisma.OTPVerificationDelegate<ExtArgs>;

  /**
   * `prisma.session`: Exposes CRUD operations for the **Session** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Sessions
    * const sessions = await prisma.session.findMany()
    * ```
    */
  get session(): Prisma.SessionDelegate<ExtArgs>;

  /**
   * `prisma.vehicle`: Exposes CRUD operations for the **Vehicle** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Vehicles
    * const vehicles = await prisma.vehicle.findMany()
    * ```
    */
  get vehicle(): Prisma.VehicleDelegate<ExtArgs>;

  /**
   * `prisma.location`: Exposes CRUD operations for the **Location** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Locations
    * const locations = await prisma.location.findMany()
    * ```
    */
  get location(): Prisma.LocationDelegate<ExtArgs>;

  /**
   * `prisma.route`: Exposes CRUD operations for the **Route** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Routes
    * const routes = await prisma.route.findMany()
    * ```
    */
  get route(): Prisma.RouteDelegate<ExtArgs>;

  /**
   * `prisma.place`: Exposes CRUD operations for the **Place** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Places
    * const places = await prisma.place.findMany()
    * ```
    */
  get place(): Prisma.PlaceDelegate<ExtArgs>;

  /**
   * `prisma.placeReview`: Exposes CRUD operations for the **PlaceReview** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PlaceReviews
    * const placeReviews = await prisma.placeReview.findMany()
    * ```
    */
  get placeReview(): Prisma.PlaceReviewDelegate<ExtArgs>;

  /**
   * `prisma.placePhoto`: Exposes CRUD operations for the **PlacePhoto** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PlacePhotos
    * const placePhotos = await prisma.placePhoto.findMany()
    * ```
    */
  get placePhoto(): Prisma.PlacePhotoDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    OTPVerification: 'OTPVerification',
    Session: 'Session',
    Vehicle: 'Vehicle',
    Location: 'Location',
    Route: 'Route',
    Place: 'Place',
    PlaceReview: 'PlaceReview',
    PlacePhoto: 'PlacePhoto'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "user" | "oTPVerification" | "session" | "vehicle" | "location" | "route" | "place" | "placeReview" | "placePhoto"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      OTPVerification: {
        payload: Prisma.$OTPVerificationPayload<ExtArgs>
        fields: Prisma.OTPVerificationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OTPVerificationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OTPVerificationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OTPVerificationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OTPVerificationPayload>
          }
          findFirst: {
            args: Prisma.OTPVerificationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OTPVerificationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OTPVerificationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OTPVerificationPayload>
          }
          findMany: {
            args: Prisma.OTPVerificationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OTPVerificationPayload>[]
          }
          create: {
            args: Prisma.OTPVerificationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OTPVerificationPayload>
          }
          createMany: {
            args: Prisma.OTPVerificationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.OTPVerificationCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OTPVerificationPayload>[]
          }
          delete: {
            args: Prisma.OTPVerificationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OTPVerificationPayload>
          }
          update: {
            args: Prisma.OTPVerificationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OTPVerificationPayload>
          }
          deleteMany: {
            args: Prisma.OTPVerificationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.OTPVerificationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.OTPVerificationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OTPVerificationPayload>
          }
          aggregate: {
            args: Prisma.OTPVerificationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateOTPVerification>
          }
          groupBy: {
            args: Prisma.OTPVerificationGroupByArgs<ExtArgs>
            result: $Utils.Optional<OTPVerificationGroupByOutputType>[]
          }
          count: {
            args: Prisma.OTPVerificationCountArgs<ExtArgs>
            result: $Utils.Optional<OTPVerificationCountAggregateOutputType> | number
          }
        }
      }
      Session: {
        payload: Prisma.$SessionPayload<ExtArgs>
        fields: Prisma.SessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SessionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SessionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          findFirst: {
            args: Prisma.SessionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SessionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          findMany: {
            args: Prisma.SessionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          create: {
            args: Prisma.SessionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          createMany: {
            args: Prisma.SessionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SessionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          delete: {
            args: Prisma.SessionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          update: {
            args: Prisma.SessionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          deleteMany: {
            args: Prisma.SessionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SessionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.SessionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          aggregate: {
            args: Prisma.SessionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSession>
          }
          groupBy: {
            args: Prisma.SessionGroupByArgs<ExtArgs>
            result: $Utils.Optional<SessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.SessionCountArgs<ExtArgs>
            result: $Utils.Optional<SessionCountAggregateOutputType> | number
          }
        }
      }
      Vehicle: {
        payload: Prisma.$VehiclePayload<ExtArgs>
        fields: Prisma.VehicleFieldRefs
        operations: {
          findUnique: {
            args: Prisma.VehicleFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.VehicleFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload>
          }
          findFirst: {
            args: Prisma.VehicleFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.VehicleFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload>
          }
          findMany: {
            args: Prisma.VehicleFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload>[]
          }
          create: {
            args: Prisma.VehicleCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload>
          }
          createMany: {
            args: Prisma.VehicleCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.VehicleCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload>[]
          }
          delete: {
            args: Prisma.VehicleDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload>
          }
          update: {
            args: Prisma.VehicleUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload>
          }
          deleteMany: {
            args: Prisma.VehicleDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.VehicleUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.VehicleUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VehiclePayload>
          }
          aggregate: {
            args: Prisma.VehicleAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateVehicle>
          }
          groupBy: {
            args: Prisma.VehicleGroupByArgs<ExtArgs>
            result: $Utils.Optional<VehicleGroupByOutputType>[]
          }
          count: {
            args: Prisma.VehicleCountArgs<ExtArgs>
            result: $Utils.Optional<VehicleCountAggregateOutputType> | number
          }
        }
      }
      Location: {
        payload: Prisma.$LocationPayload<ExtArgs>
        fields: Prisma.LocationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.LocationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.LocationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocationPayload>
          }
          findFirst: {
            args: Prisma.LocationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.LocationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocationPayload>
          }
          findMany: {
            args: Prisma.LocationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocationPayload>[]
          }
          create: {
            args: Prisma.LocationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocationPayload>
          }
          createMany: {
            args: Prisma.LocationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.LocationCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocationPayload>[]
          }
          delete: {
            args: Prisma.LocationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocationPayload>
          }
          update: {
            args: Prisma.LocationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocationPayload>
          }
          deleteMany: {
            args: Prisma.LocationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.LocationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.LocationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LocationPayload>
          }
          aggregate: {
            args: Prisma.LocationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLocation>
          }
          groupBy: {
            args: Prisma.LocationGroupByArgs<ExtArgs>
            result: $Utils.Optional<LocationGroupByOutputType>[]
          }
          count: {
            args: Prisma.LocationCountArgs<ExtArgs>
            result: $Utils.Optional<LocationCountAggregateOutputType> | number
          }
        }
      }
      Route: {
        payload: Prisma.$RoutePayload<ExtArgs>
        fields: Prisma.RouteFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RouteFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RouteFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload>
          }
          findFirst: {
            args: Prisma.RouteFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RouteFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload>
          }
          findMany: {
            args: Prisma.RouteFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload>[]
          }
          create: {
            args: Prisma.RouteCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload>
          }
          createMany: {
            args: Prisma.RouteCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RouteCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload>[]
          }
          delete: {
            args: Prisma.RouteDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload>
          }
          update: {
            args: Prisma.RouteUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload>
          }
          deleteMany: {
            args: Prisma.RouteDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RouteUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.RouteUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutePayload>
          }
          aggregate: {
            args: Prisma.RouteAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRoute>
          }
          groupBy: {
            args: Prisma.RouteGroupByArgs<ExtArgs>
            result: $Utils.Optional<RouteGroupByOutputType>[]
          }
          count: {
            args: Prisma.RouteCountArgs<ExtArgs>
            result: $Utils.Optional<RouteCountAggregateOutputType> | number
          }
        }
      }
      Place: {
        payload: Prisma.$PlacePayload<ExtArgs>
        fields: Prisma.PlaceFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PlaceFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PlaceFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePayload>
          }
          findFirst: {
            args: Prisma.PlaceFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PlaceFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePayload>
          }
          findMany: {
            args: Prisma.PlaceFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePayload>[]
          }
          create: {
            args: Prisma.PlaceCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePayload>
          }
          createMany: {
            args: Prisma.PlaceCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PlaceCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePayload>[]
          }
          delete: {
            args: Prisma.PlaceDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePayload>
          }
          update: {
            args: Prisma.PlaceUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePayload>
          }
          deleteMany: {
            args: Prisma.PlaceDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PlaceUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.PlaceUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePayload>
          }
          aggregate: {
            args: Prisma.PlaceAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePlace>
          }
          groupBy: {
            args: Prisma.PlaceGroupByArgs<ExtArgs>
            result: $Utils.Optional<PlaceGroupByOutputType>[]
          }
          count: {
            args: Prisma.PlaceCountArgs<ExtArgs>
            result: $Utils.Optional<PlaceCountAggregateOutputType> | number
          }
        }
      }
      PlaceReview: {
        payload: Prisma.$PlaceReviewPayload<ExtArgs>
        fields: Prisma.PlaceReviewFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PlaceReviewFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaceReviewPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PlaceReviewFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaceReviewPayload>
          }
          findFirst: {
            args: Prisma.PlaceReviewFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaceReviewPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PlaceReviewFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaceReviewPayload>
          }
          findMany: {
            args: Prisma.PlaceReviewFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaceReviewPayload>[]
          }
          create: {
            args: Prisma.PlaceReviewCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaceReviewPayload>
          }
          createMany: {
            args: Prisma.PlaceReviewCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PlaceReviewCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaceReviewPayload>[]
          }
          delete: {
            args: Prisma.PlaceReviewDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaceReviewPayload>
          }
          update: {
            args: Prisma.PlaceReviewUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaceReviewPayload>
          }
          deleteMany: {
            args: Prisma.PlaceReviewDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PlaceReviewUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.PlaceReviewUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaceReviewPayload>
          }
          aggregate: {
            args: Prisma.PlaceReviewAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePlaceReview>
          }
          groupBy: {
            args: Prisma.PlaceReviewGroupByArgs<ExtArgs>
            result: $Utils.Optional<PlaceReviewGroupByOutputType>[]
          }
          count: {
            args: Prisma.PlaceReviewCountArgs<ExtArgs>
            result: $Utils.Optional<PlaceReviewCountAggregateOutputType> | number
          }
        }
      }
      PlacePhoto: {
        payload: Prisma.$PlacePhotoPayload<ExtArgs>
        fields: Prisma.PlacePhotoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PlacePhotoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePhotoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PlacePhotoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePhotoPayload>
          }
          findFirst: {
            args: Prisma.PlacePhotoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePhotoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PlacePhotoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePhotoPayload>
          }
          findMany: {
            args: Prisma.PlacePhotoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePhotoPayload>[]
          }
          create: {
            args: Prisma.PlacePhotoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePhotoPayload>
          }
          createMany: {
            args: Prisma.PlacePhotoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PlacePhotoCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePhotoPayload>[]
          }
          delete: {
            args: Prisma.PlacePhotoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePhotoPayload>
          }
          update: {
            args: Prisma.PlacePhotoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePhotoPayload>
          }
          deleteMany: {
            args: Prisma.PlacePhotoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PlacePhotoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.PlacePhotoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlacePhotoPayload>
          }
          aggregate: {
            args: Prisma.PlacePhotoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePlacePhoto>
          }
          groupBy: {
            args: Prisma.PlacePhotoGroupByArgs<ExtArgs>
            result: $Utils.Optional<PlacePhotoGroupByOutputType>[]
          }
          count: {
            args: Prisma.PlacePhotoCountArgs<ExtArgs>
            result: $Utils.Optional<PlacePhotoCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }


  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    otpVerifications: number
    sessions: number
    vehicles: number
    locations: number
    routes: number
    places: number
    placeReviews: number
    placePhotos: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    otpVerifications?: boolean | UserCountOutputTypeCountOtpVerificationsArgs
    sessions?: boolean | UserCountOutputTypeCountSessionsArgs
    vehicles?: boolean | UserCountOutputTypeCountVehiclesArgs
    locations?: boolean | UserCountOutputTypeCountLocationsArgs
    routes?: boolean | UserCountOutputTypeCountRoutesArgs
    places?: boolean | UserCountOutputTypeCountPlacesArgs
    placeReviews?: boolean | UserCountOutputTypeCountPlaceReviewsArgs
    placePhotos?: boolean | UserCountOutputTypeCountPlacePhotosArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountOtpVerificationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OTPVerificationWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SessionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountVehiclesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: VehicleWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountLocationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LocationWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountRoutesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RouteWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountPlacesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PlaceWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountPlaceReviewsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PlaceReviewWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountPlacePhotosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PlacePhotoWhereInput
  }


  /**
   * Count Type VehicleCountOutputType
   */

  export type VehicleCountOutputType = {
    locations: number
    routes: number
  }

  export type VehicleCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    locations?: boolean | VehicleCountOutputTypeCountLocationsArgs
    routes?: boolean | VehicleCountOutputTypeCountRoutesArgs
  }

  // Custom InputTypes
  /**
   * VehicleCountOutputType without action
   */
  export type VehicleCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VehicleCountOutputType
     */
    select?: VehicleCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * VehicleCountOutputType without action
   */
  export type VehicleCountOutputTypeCountLocationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LocationWhereInput
  }

  /**
   * VehicleCountOutputType without action
   */
  export type VehicleCountOutputTypeCountRoutesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RouteWhereInput
  }


  /**
   * Count Type PlaceCountOutputType
   */

  export type PlaceCountOutputType = {
    reviews: number
    photos: number
  }

  export type PlaceCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    reviews?: boolean | PlaceCountOutputTypeCountReviewsArgs
    photos?: boolean | PlaceCountOutputTypeCountPhotosArgs
  }

  // Custom InputTypes
  /**
   * PlaceCountOutputType without action
   */
  export type PlaceCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaceCountOutputType
     */
    select?: PlaceCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * PlaceCountOutputType without action
   */
  export type PlaceCountOutputTypeCountReviewsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PlaceReviewWhereInput
  }

  /**
   * PlaceCountOutputType without action
   */
  export type PlaceCountOutputTypeCountPhotosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PlacePhotoWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    name: string | null
    email: string | null
    password: string | null
    googleId: string | null
    picture: string | null
    emailVerified: boolean | null
    lastGridExtractAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    name: string | null
    email: string | null
    password: string | null
    googleId: string | null
    picture: string | null
    emailVerified: boolean | null
    lastGridExtractAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    name: number
    email: number
    password: number
    googleId: number
    picture: number
    emailVerified: number
    lastGridExtractAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    name?: true
    email?: true
    password?: true
    googleId?: true
    picture?: true
    emailVerified?: true
    lastGridExtractAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    name?: true
    email?: true
    password?: true
    googleId?: true
    picture?: true
    emailVerified?: true
    lastGridExtractAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    name?: true
    email?: true
    password?: true
    googleId?: true
    picture?: true
    emailVerified?: true
    lastGridExtractAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    name: string
    email: string
    password: string | null
    googleId: string | null
    picture: string | null
    emailVerified: boolean
    lastGridExtractAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    password?: boolean
    googleId?: boolean
    picture?: boolean
    emailVerified?: boolean
    lastGridExtractAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    otpVerifications?: boolean | User$otpVerificationsArgs<ExtArgs>
    sessions?: boolean | User$sessionsArgs<ExtArgs>
    vehicles?: boolean | User$vehiclesArgs<ExtArgs>
    locations?: boolean | User$locationsArgs<ExtArgs>
    routes?: boolean | User$routesArgs<ExtArgs>
    places?: boolean | User$placesArgs<ExtArgs>
    placeReviews?: boolean | User$placeReviewsArgs<ExtArgs>
    placePhotos?: boolean | User$placePhotosArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    password?: boolean
    googleId?: boolean
    picture?: boolean
    emailVerified?: boolean
    lastGridExtractAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    name?: boolean
    email?: boolean
    password?: boolean
    googleId?: boolean
    picture?: boolean
    emailVerified?: boolean
    lastGridExtractAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    otpVerifications?: boolean | User$otpVerificationsArgs<ExtArgs>
    sessions?: boolean | User$sessionsArgs<ExtArgs>
    vehicles?: boolean | User$vehiclesArgs<ExtArgs>
    locations?: boolean | User$locationsArgs<ExtArgs>
    routes?: boolean | User$routesArgs<ExtArgs>
    places?: boolean | User$placesArgs<ExtArgs>
    placeReviews?: boolean | User$placeReviewsArgs<ExtArgs>
    placePhotos?: boolean | User$placePhotosArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      otpVerifications: Prisma.$OTPVerificationPayload<ExtArgs>[]
      sessions: Prisma.$SessionPayload<ExtArgs>[]
      vehicles: Prisma.$VehiclePayload<ExtArgs>[]
      locations: Prisma.$LocationPayload<ExtArgs>[]
      routes: Prisma.$RoutePayload<ExtArgs>[]
      places: Prisma.$PlacePayload<ExtArgs>[]
      placeReviews: Prisma.$PlaceReviewPayload<ExtArgs>[]
      placePhotos: Prisma.$PlacePhotoPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      email: string
      password: string | null
      googleId: string | null
      picture: string | null
      emailVerified: boolean
      lastGridExtractAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    otpVerifications<T extends User$otpVerificationsArgs<ExtArgs> = {}>(args?: Subset<T, User$otpVerificationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OTPVerificationPayload<ExtArgs>, T, "findMany"> | Null>
    sessions<T extends User$sessionsArgs<ExtArgs> = {}>(args?: Subset<T, User$sessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findMany"> | Null>
    vehicles<T extends User$vehiclesArgs<ExtArgs> = {}>(args?: Subset<T, User$vehiclesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "findMany"> | Null>
    locations<T extends User$locationsArgs<ExtArgs> = {}>(args?: Subset<T, User$locationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LocationPayload<ExtArgs>, T, "findMany"> | Null>
    routes<T extends User$routesArgs<ExtArgs> = {}>(args?: Subset<T, User$routesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "findMany"> | Null>
    places<T extends User$placesArgs<ExtArgs> = {}>(args?: Subset<T, User$placesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlacePayload<ExtArgs>, T, "findMany"> | Null>
    placeReviews<T extends User$placeReviewsArgs<ExtArgs> = {}>(args?: Subset<T, User$placeReviewsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlaceReviewPayload<ExtArgs>, T, "findMany"> | Null>
    placePhotos<T extends User$placePhotosArgs<ExtArgs> = {}>(args?: Subset<T, User$placePhotosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlacePhotoPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */ 
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly name: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly password: FieldRef<"User", 'String'>
    readonly googleId: FieldRef<"User", 'String'>
    readonly picture: FieldRef<"User", 'String'>
    readonly emailVerified: FieldRef<"User", 'Boolean'>
    readonly lastGridExtractAt: FieldRef<"User", 'DateTime'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
  }

  /**
   * User.otpVerifications
   */
  export type User$otpVerificationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OTPVerification
     */
    select?: OTPVerificationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OTPVerificationInclude<ExtArgs> | null
    where?: OTPVerificationWhereInput
    orderBy?: OTPVerificationOrderByWithRelationInput | OTPVerificationOrderByWithRelationInput[]
    cursor?: OTPVerificationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: OTPVerificationScalarFieldEnum | OTPVerificationScalarFieldEnum[]
  }

  /**
   * User.sessions
   */
  export type User$sessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    where?: SessionWhereInput
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    cursor?: SessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * User.vehicles
   */
  export type User$vehiclesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    where?: VehicleWhereInput
    orderBy?: VehicleOrderByWithRelationInput | VehicleOrderByWithRelationInput[]
    cursor?: VehicleWhereUniqueInput
    take?: number
    skip?: number
    distinct?: VehicleScalarFieldEnum | VehicleScalarFieldEnum[]
  }

  /**
   * User.locations
   */
  export type User$locationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Location
     */
    select?: LocationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LocationInclude<ExtArgs> | null
    where?: LocationWhereInput
    orderBy?: LocationOrderByWithRelationInput | LocationOrderByWithRelationInput[]
    cursor?: LocationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LocationScalarFieldEnum | LocationScalarFieldEnum[]
  }

  /**
   * User.routes
   */
  export type User$routesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    where?: RouteWhereInput
    orderBy?: RouteOrderByWithRelationInput | RouteOrderByWithRelationInput[]
    cursor?: RouteWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RouteScalarFieldEnum | RouteScalarFieldEnum[]
  }

  /**
   * User.places
   */
  export type User$placesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Place
     */
    select?: PlaceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceInclude<ExtArgs> | null
    where?: PlaceWhereInput
    orderBy?: PlaceOrderByWithRelationInput | PlaceOrderByWithRelationInput[]
    cursor?: PlaceWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PlaceScalarFieldEnum | PlaceScalarFieldEnum[]
  }

  /**
   * User.placeReviews
   */
  export type User$placeReviewsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaceReview
     */
    select?: PlaceReviewSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceReviewInclude<ExtArgs> | null
    where?: PlaceReviewWhereInput
    orderBy?: PlaceReviewOrderByWithRelationInput | PlaceReviewOrderByWithRelationInput[]
    cursor?: PlaceReviewWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PlaceReviewScalarFieldEnum | PlaceReviewScalarFieldEnum[]
  }

  /**
   * User.placePhotos
   */
  export type User$placePhotosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlacePhoto
     */
    select?: PlacePhotoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlacePhotoInclude<ExtArgs> | null
    where?: PlacePhotoWhereInput
    orderBy?: PlacePhotoOrderByWithRelationInput | PlacePhotoOrderByWithRelationInput[]
    cursor?: PlacePhotoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PlacePhotoScalarFieldEnum | PlacePhotoScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model OTPVerification
   */

  export type AggregateOTPVerification = {
    _count: OTPVerificationCountAggregateOutputType | null
    _min: OTPVerificationMinAggregateOutputType | null
    _max: OTPVerificationMaxAggregateOutputType | null
  }

  export type OTPVerificationMinAggregateOutputType = {
    id: string | null
    email: string | null
    otp: string | null
    type: string | null
    expiresAt: Date | null
    verified: boolean | null
    createdAt: Date | null
    userId: string | null
  }

  export type OTPVerificationMaxAggregateOutputType = {
    id: string | null
    email: string | null
    otp: string | null
    type: string | null
    expiresAt: Date | null
    verified: boolean | null
    createdAt: Date | null
    userId: string | null
  }

  export type OTPVerificationCountAggregateOutputType = {
    id: number
    email: number
    otp: number
    type: number
    expiresAt: number
    verified: number
    createdAt: number
    userId: number
    _all: number
  }


  export type OTPVerificationMinAggregateInputType = {
    id?: true
    email?: true
    otp?: true
    type?: true
    expiresAt?: true
    verified?: true
    createdAt?: true
    userId?: true
  }

  export type OTPVerificationMaxAggregateInputType = {
    id?: true
    email?: true
    otp?: true
    type?: true
    expiresAt?: true
    verified?: true
    createdAt?: true
    userId?: true
  }

  export type OTPVerificationCountAggregateInputType = {
    id?: true
    email?: true
    otp?: true
    type?: true
    expiresAt?: true
    verified?: true
    createdAt?: true
    userId?: true
    _all?: true
  }

  export type OTPVerificationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OTPVerification to aggregate.
     */
    where?: OTPVerificationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OTPVerifications to fetch.
     */
    orderBy?: OTPVerificationOrderByWithRelationInput | OTPVerificationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OTPVerificationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OTPVerifications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OTPVerifications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned OTPVerifications
    **/
    _count?: true | OTPVerificationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OTPVerificationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OTPVerificationMaxAggregateInputType
  }

  export type GetOTPVerificationAggregateType<T extends OTPVerificationAggregateArgs> = {
        [P in keyof T & keyof AggregateOTPVerification]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOTPVerification[P]>
      : GetScalarType<T[P], AggregateOTPVerification[P]>
  }




  export type OTPVerificationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OTPVerificationWhereInput
    orderBy?: OTPVerificationOrderByWithAggregationInput | OTPVerificationOrderByWithAggregationInput[]
    by: OTPVerificationScalarFieldEnum[] | OTPVerificationScalarFieldEnum
    having?: OTPVerificationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OTPVerificationCountAggregateInputType | true
    _min?: OTPVerificationMinAggregateInputType
    _max?: OTPVerificationMaxAggregateInputType
  }

  export type OTPVerificationGroupByOutputType = {
    id: string
    email: string
    otp: string
    type: string
    expiresAt: Date
    verified: boolean
    createdAt: Date
    userId: string | null
    _count: OTPVerificationCountAggregateOutputType | null
    _min: OTPVerificationMinAggregateOutputType | null
    _max: OTPVerificationMaxAggregateOutputType | null
  }

  type GetOTPVerificationGroupByPayload<T extends OTPVerificationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OTPVerificationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OTPVerificationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OTPVerificationGroupByOutputType[P]>
            : GetScalarType<T[P], OTPVerificationGroupByOutputType[P]>
        }
      >
    >


  export type OTPVerificationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    otp?: boolean
    type?: boolean
    expiresAt?: boolean
    verified?: boolean
    createdAt?: boolean
    userId?: boolean
    user?: boolean | OTPVerification$userArgs<ExtArgs>
  }, ExtArgs["result"]["oTPVerification"]>

  export type OTPVerificationSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    otp?: boolean
    type?: boolean
    expiresAt?: boolean
    verified?: boolean
    createdAt?: boolean
    userId?: boolean
    user?: boolean | OTPVerification$userArgs<ExtArgs>
  }, ExtArgs["result"]["oTPVerification"]>

  export type OTPVerificationSelectScalar = {
    id?: boolean
    email?: boolean
    otp?: boolean
    type?: boolean
    expiresAt?: boolean
    verified?: boolean
    createdAt?: boolean
    userId?: boolean
  }

  export type OTPVerificationInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | OTPVerification$userArgs<ExtArgs>
  }
  export type OTPVerificationIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | OTPVerification$userArgs<ExtArgs>
  }

  export type $OTPVerificationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "OTPVerification"
    objects: {
      user: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      email: string
      otp: string
      type: string
      expiresAt: Date
      verified: boolean
      createdAt: Date
      userId: string | null
    }, ExtArgs["result"]["oTPVerification"]>
    composites: {}
  }

  type OTPVerificationGetPayload<S extends boolean | null | undefined | OTPVerificationDefaultArgs> = $Result.GetResult<Prisma.$OTPVerificationPayload, S>

  type OTPVerificationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<OTPVerificationFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: OTPVerificationCountAggregateInputType | true
    }

  export interface OTPVerificationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['OTPVerification'], meta: { name: 'OTPVerification' } }
    /**
     * Find zero or one OTPVerification that matches the filter.
     * @param {OTPVerificationFindUniqueArgs} args - Arguments to find a OTPVerification
     * @example
     * // Get one OTPVerification
     * const oTPVerification = await prisma.oTPVerification.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends OTPVerificationFindUniqueArgs>(args: SelectSubset<T, OTPVerificationFindUniqueArgs<ExtArgs>>): Prisma__OTPVerificationClient<$Result.GetResult<Prisma.$OTPVerificationPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one OTPVerification that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {OTPVerificationFindUniqueOrThrowArgs} args - Arguments to find a OTPVerification
     * @example
     * // Get one OTPVerification
     * const oTPVerification = await prisma.oTPVerification.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends OTPVerificationFindUniqueOrThrowArgs>(args: SelectSubset<T, OTPVerificationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__OTPVerificationClient<$Result.GetResult<Prisma.$OTPVerificationPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first OTPVerification that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OTPVerificationFindFirstArgs} args - Arguments to find a OTPVerification
     * @example
     * // Get one OTPVerification
     * const oTPVerification = await prisma.oTPVerification.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends OTPVerificationFindFirstArgs>(args?: SelectSubset<T, OTPVerificationFindFirstArgs<ExtArgs>>): Prisma__OTPVerificationClient<$Result.GetResult<Prisma.$OTPVerificationPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first OTPVerification that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OTPVerificationFindFirstOrThrowArgs} args - Arguments to find a OTPVerification
     * @example
     * // Get one OTPVerification
     * const oTPVerification = await prisma.oTPVerification.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends OTPVerificationFindFirstOrThrowArgs>(args?: SelectSubset<T, OTPVerificationFindFirstOrThrowArgs<ExtArgs>>): Prisma__OTPVerificationClient<$Result.GetResult<Prisma.$OTPVerificationPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more OTPVerifications that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OTPVerificationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all OTPVerifications
     * const oTPVerifications = await prisma.oTPVerification.findMany()
     * 
     * // Get first 10 OTPVerifications
     * const oTPVerifications = await prisma.oTPVerification.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const oTPVerificationWithIdOnly = await prisma.oTPVerification.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends OTPVerificationFindManyArgs>(args?: SelectSubset<T, OTPVerificationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OTPVerificationPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a OTPVerification.
     * @param {OTPVerificationCreateArgs} args - Arguments to create a OTPVerification.
     * @example
     * // Create one OTPVerification
     * const OTPVerification = await prisma.oTPVerification.create({
     *   data: {
     *     // ... data to create a OTPVerification
     *   }
     * })
     * 
     */
    create<T extends OTPVerificationCreateArgs>(args: SelectSubset<T, OTPVerificationCreateArgs<ExtArgs>>): Prisma__OTPVerificationClient<$Result.GetResult<Prisma.$OTPVerificationPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many OTPVerifications.
     * @param {OTPVerificationCreateManyArgs} args - Arguments to create many OTPVerifications.
     * @example
     * // Create many OTPVerifications
     * const oTPVerification = await prisma.oTPVerification.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends OTPVerificationCreateManyArgs>(args?: SelectSubset<T, OTPVerificationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many OTPVerifications and returns the data saved in the database.
     * @param {OTPVerificationCreateManyAndReturnArgs} args - Arguments to create many OTPVerifications.
     * @example
     * // Create many OTPVerifications
     * const oTPVerification = await prisma.oTPVerification.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many OTPVerifications and only return the `id`
     * const oTPVerificationWithIdOnly = await prisma.oTPVerification.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends OTPVerificationCreateManyAndReturnArgs>(args?: SelectSubset<T, OTPVerificationCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OTPVerificationPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a OTPVerification.
     * @param {OTPVerificationDeleteArgs} args - Arguments to delete one OTPVerification.
     * @example
     * // Delete one OTPVerification
     * const OTPVerification = await prisma.oTPVerification.delete({
     *   where: {
     *     // ... filter to delete one OTPVerification
     *   }
     * })
     * 
     */
    delete<T extends OTPVerificationDeleteArgs>(args: SelectSubset<T, OTPVerificationDeleteArgs<ExtArgs>>): Prisma__OTPVerificationClient<$Result.GetResult<Prisma.$OTPVerificationPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one OTPVerification.
     * @param {OTPVerificationUpdateArgs} args - Arguments to update one OTPVerification.
     * @example
     * // Update one OTPVerification
     * const oTPVerification = await prisma.oTPVerification.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends OTPVerificationUpdateArgs>(args: SelectSubset<T, OTPVerificationUpdateArgs<ExtArgs>>): Prisma__OTPVerificationClient<$Result.GetResult<Prisma.$OTPVerificationPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more OTPVerifications.
     * @param {OTPVerificationDeleteManyArgs} args - Arguments to filter OTPVerifications to delete.
     * @example
     * // Delete a few OTPVerifications
     * const { count } = await prisma.oTPVerification.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends OTPVerificationDeleteManyArgs>(args?: SelectSubset<T, OTPVerificationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more OTPVerifications.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OTPVerificationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many OTPVerifications
     * const oTPVerification = await prisma.oTPVerification.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends OTPVerificationUpdateManyArgs>(args: SelectSubset<T, OTPVerificationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one OTPVerification.
     * @param {OTPVerificationUpsertArgs} args - Arguments to update or create a OTPVerification.
     * @example
     * // Update or create a OTPVerification
     * const oTPVerification = await prisma.oTPVerification.upsert({
     *   create: {
     *     // ... data to create a OTPVerification
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the OTPVerification we want to update
     *   }
     * })
     */
    upsert<T extends OTPVerificationUpsertArgs>(args: SelectSubset<T, OTPVerificationUpsertArgs<ExtArgs>>): Prisma__OTPVerificationClient<$Result.GetResult<Prisma.$OTPVerificationPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of OTPVerifications.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OTPVerificationCountArgs} args - Arguments to filter OTPVerifications to count.
     * @example
     * // Count the number of OTPVerifications
     * const count = await prisma.oTPVerification.count({
     *   where: {
     *     // ... the filter for the OTPVerifications we want to count
     *   }
     * })
    **/
    count<T extends OTPVerificationCountArgs>(
      args?: Subset<T, OTPVerificationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OTPVerificationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a OTPVerification.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OTPVerificationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OTPVerificationAggregateArgs>(args: Subset<T, OTPVerificationAggregateArgs>): Prisma.PrismaPromise<GetOTPVerificationAggregateType<T>>

    /**
     * Group by OTPVerification.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OTPVerificationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OTPVerificationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OTPVerificationGroupByArgs['orderBy'] }
        : { orderBy?: OTPVerificationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OTPVerificationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOTPVerificationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the OTPVerification model
   */
  readonly fields: OTPVerificationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for OTPVerification.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OTPVerificationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends OTPVerification$userArgs<ExtArgs> = {}>(args?: Subset<T, OTPVerification$userArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the OTPVerification model
   */ 
  interface OTPVerificationFieldRefs {
    readonly id: FieldRef<"OTPVerification", 'String'>
    readonly email: FieldRef<"OTPVerification", 'String'>
    readonly otp: FieldRef<"OTPVerification", 'String'>
    readonly type: FieldRef<"OTPVerification", 'String'>
    readonly expiresAt: FieldRef<"OTPVerification", 'DateTime'>
    readonly verified: FieldRef<"OTPVerification", 'Boolean'>
    readonly createdAt: FieldRef<"OTPVerification", 'DateTime'>
    readonly userId: FieldRef<"OTPVerification", 'String'>
  }
    

  // Custom InputTypes
  /**
   * OTPVerification findUnique
   */
  export type OTPVerificationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OTPVerification
     */
    select?: OTPVerificationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OTPVerificationInclude<ExtArgs> | null
    /**
     * Filter, which OTPVerification to fetch.
     */
    where: OTPVerificationWhereUniqueInput
  }

  /**
   * OTPVerification findUniqueOrThrow
   */
  export type OTPVerificationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OTPVerification
     */
    select?: OTPVerificationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OTPVerificationInclude<ExtArgs> | null
    /**
     * Filter, which OTPVerification to fetch.
     */
    where: OTPVerificationWhereUniqueInput
  }

  /**
   * OTPVerification findFirst
   */
  export type OTPVerificationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OTPVerification
     */
    select?: OTPVerificationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OTPVerificationInclude<ExtArgs> | null
    /**
     * Filter, which OTPVerification to fetch.
     */
    where?: OTPVerificationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OTPVerifications to fetch.
     */
    orderBy?: OTPVerificationOrderByWithRelationInput | OTPVerificationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OTPVerifications.
     */
    cursor?: OTPVerificationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OTPVerifications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OTPVerifications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OTPVerifications.
     */
    distinct?: OTPVerificationScalarFieldEnum | OTPVerificationScalarFieldEnum[]
  }

  /**
   * OTPVerification findFirstOrThrow
   */
  export type OTPVerificationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OTPVerification
     */
    select?: OTPVerificationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OTPVerificationInclude<ExtArgs> | null
    /**
     * Filter, which OTPVerification to fetch.
     */
    where?: OTPVerificationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OTPVerifications to fetch.
     */
    orderBy?: OTPVerificationOrderByWithRelationInput | OTPVerificationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OTPVerifications.
     */
    cursor?: OTPVerificationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OTPVerifications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OTPVerifications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OTPVerifications.
     */
    distinct?: OTPVerificationScalarFieldEnum | OTPVerificationScalarFieldEnum[]
  }

  /**
   * OTPVerification findMany
   */
  export type OTPVerificationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OTPVerification
     */
    select?: OTPVerificationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OTPVerificationInclude<ExtArgs> | null
    /**
     * Filter, which OTPVerifications to fetch.
     */
    where?: OTPVerificationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OTPVerifications to fetch.
     */
    orderBy?: OTPVerificationOrderByWithRelationInput | OTPVerificationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing OTPVerifications.
     */
    cursor?: OTPVerificationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OTPVerifications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OTPVerifications.
     */
    skip?: number
    distinct?: OTPVerificationScalarFieldEnum | OTPVerificationScalarFieldEnum[]
  }

  /**
   * OTPVerification create
   */
  export type OTPVerificationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OTPVerification
     */
    select?: OTPVerificationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OTPVerificationInclude<ExtArgs> | null
    /**
     * The data needed to create a OTPVerification.
     */
    data: XOR<OTPVerificationCreateInput, OTPVerificationUncheckedCreateInput>
  }

  /**
   * OTPVerification createMany
   */
  export type OTPVerificationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many OTPVerifications.
     */
    data: OTPVerificationCreateManyInput | OTPVerificationCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * OTPVerification createManyAndReturn
   */
  export type OTPVerificationCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OTPVerification
     */
    select?: OTPVerificationSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many OTPVerifications.
     */
    data: OTPVerificationCreateManyInput | OTPVerificationCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OTPVerificationIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * OTPVerification update
   */
  export type OTPVerificationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OTPVerification
     */
    select?: OTPVerificationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OTPVerificationInclude<ExtArgs> | null
    /**
     * The data needed to update a OTPVerification.
     */
    data: XOR<OTPVerificationUpdateInput, OTPVerificationUncheckedUpdateInput>
    /**
     * Choose, which OTPVerification to update.
     */
    where: OTPVerificationWhereUniqueInput
  }

  /**
   * OTPVerification updateMany
   */
  export type OTPVerificationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update OTPVerifications.
     */
    data: XOR<OTPVerificationUpdateManyMutationInput, OTPVerificationUncheckedUpdateManyInput>
    /**
     * Filter which OTPVerifications to update
     */
    where?: OTPVerificationWhereInput
  }

  /**
   * OTPVerification upsert
   */
  export type OTPVerificationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OTPVerification
     */
    select?: OTPVerificationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OTPVerificationInclude<ExtArgs> | null
    /**
     * The filter to search for the OTPVerification to update in case it exists.
     */
    where: OTPVerificationWhereUniqueInput
    /**
     * In case the OTPVerification found by the `where` argument doesn't exist, create a new OTPVerification with this data.
     */
    create: XOR<OTPVerificationCreateInput, OTPVerificationUncheckedCreateInput>
    /**
     * In case the OTPVerification was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OTPVerificationUpdateInput, OTPVerificationUncheckedUpdateInput>
  }

  /**
   * OTPVerification delete
   */
  export type OTPVerificationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OTPVerification
     */
    select?: OTPVerificationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OTPVerificationInclude<ExtArgs> | null
    /**
     * Filter which OTPVerification to delete.
     */
    where: OTPVerificationWhereUniqueInput
  }

  /**
   * OTPVerification deleteMany
   */
  export type OTPVerificationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OTPVerifications to delete
     */
    where?: OTPVerificationWhereInput
  }

  /**
   * OTPVerification.user
   */
  export type OTPVerification$userArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * OTPVerification without action
   */
  export type OTPVerificationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OTPVerification
     */
    select?: OTPVerificationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OTPVerificationInclude<ExtArgs> | null
  }


  /**
   * Model Session
   */

  export type AggregateSession = {
    _count: SessionCountAggregateOutputType | null
    _min: SessionMinAggregateOutputType | null
    _max: SessionMaxAggregateOutputType | null
  }

  export type SessionMinAggregateOutputType = {
    id: string | null
    userId: string | null
    token: string | null
    expiresAt: Date | null
    createdAt: Date | null
  }

  export type SessionMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    token: string | null
    expiresAt: Date | null
    createdAt: Date | null
  }

  export type SessionCountAggregateOutputType = {
    id: number
    userId: number
    token: number
    expiresAt: number
    createdAt: number
    _all: number
  }


  export type SessionMinAggregateInputType = {
    id?: true
    userId?: true
    token?: true
    expiresAt?: true
    createdAt?: true
  }

  export type SessionMaxAggregateInputType = {
    id?: true
    userId?: true
    token?: true
    expiresAt?: true
    createdAt?: true
  }

  export type SessionCountAggregateInputType = {
    id?: true
    userId?: true
    token?: true
    expiresAt?: true
    createdAt?: true
    _all?: true
  }

  export type SessionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Session to aggregate.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Sessions
    **/
    _count?: true | SessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SessionMaxAggregateInputType
  }

  export type GetSessionAggregateType<T extends SessionAggregateArgs> = {
        [P in keyof T & keyof AggregateSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSession[P]>
      : GetScalarType<T[P], AggregateSession[P]>
  }




  export type SessionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SessionWhereInput
    orderBy?: SessionOrderByWithAggregationInput | SessionOrderByWithAggregationInput[]
    by: SessionScalarFieldEnum[] | SessionScalarFieldEnum
    having?: SessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SessionCountAggregateInputType | true
    _min?: SessionMinAggregateInputType
    _max?: SessionMaxAggregateInputType
  }

  export type SessionGroupByOutputType = {
    id: string
    userId: string
    token: string
    expiresAt: Date
    createdAt: Date
    _count: SessionCountAggregateOutputType | null
    _min: SessionMinAggregateOutputType | null
    _max: SessionMaxAggregateOutputType | null
  }

  type GetSessionGroupByPayload<T extends SessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SessionGroupByOutputType[P]>
            : GetScalarType<T[P], SessionGroupByOutputType[P]>
        }
      >
    >


  export type SessionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    token?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    token?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectScalar = {
    id?: boolean
    userId?: boolean
    token?: boolean
    expiresAt?: boolean
    createdAt?: boolean
  }

  export type SessionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type SessionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $SessionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Session"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      token: string
      expiresAt: Date
      createdAt: Date
    }, ExtArgs["result"]["session"]>
    composites: {}
  }

  type SessionGetPayload<S extends boolean | null | undefined | SessionDefaultArgs> = $Result.GetResult<Prisma.$SessionPayload, S>

  type SessionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<SessionFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: SessionCountAggregateInputType | true
    }

  export interface SessionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Session'], meta: { name: 'Session' } }
    /**
     * Find zero or one Session that matches the filter.
     * @param {SessionFindUniqueArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SessionFindUniqueArgs>(args: SelectSubset<T, SessionFindUniqueArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Session that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {SessionFindUniqueOrThrowArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SessionFindUniqueOrThrowArgs>(args: SelectSubset<T, SessionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Session that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindFirstArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SessionFindFirstArgs>(args?: SelectSubset<T, SessionFindFirstArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Session that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindFirstOrThrowArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SessionFindFirstOrThrowArgs>(args?: SelectSubset<T, SessionFindFirstOrThrowArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Sessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Sessions
     * const sessions = await prisma.session.findMany()
     * 
     * // Get first 10 Sessions
     * const sessions = await prisma.session.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const sessionWithIdOnly = await prisma.session.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SessionFindManyArgs>(args?: SelectSubset<T, SessionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Session.
     * @param {SessionCreateArgs} args - Arguments to create a Session.
     * @example
     * // Create one Session
     * const Session = await prisma.session.create({
     *   data: {
     *     // ... data to create a Session
     *   }
     * })
     * 
     */
    create<T extends SessionCreateArgs>(args: SelectSubset<T, SessionCreateArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Sessions.
     * @param {SessionCreateManyArgs} args - Arguments to create many Sessions.
     * @example
     * // Create many Sessions
     * const session = await prisma.session.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SessionCreateManyArgs>(args?: SelectSubset<T, SessionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Sessions and returns the data saved in the database.
     * @param {SessionCreateManyAndReturnArgs} args - Arguments to create many Sessions.
     * @example
     * // Create many Sessions
     * const session = await prisma.session.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Sessions and only return the `id`
     * const sessionWithIdOnly = await prisma.session.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SessionCreateManyAndReturnArgs>(args?: SelectSubset<T, SessionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Session.
     * @param {SessionDeleteArgs} args - Arguments to delete one Session.
     * @example
     * // Delete one Session
     * const Session = await prisma.session.delete({
     *   where: {
     *     // ... filter to delete one Session
     *   }
     * })
     * 
     */
    delete<T extends SessionDeleteArgs>(args: SelectSubset<T, SessionDeleteArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Session.
     * @param {SessionUpdateArgs} args - Arguments to update one Session.
     * @example
     * // Update one Session
     * const session = await prisma.session.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SessionUpdateArgs>(args: SelectSubset<T, SessionUpdateArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Sessions.
     * @param {SessionDeleteManyArgs} args - Arguments to filter Sessions to delete.
     * @example
     * // Delete a few Sessions
     * const { count } = await prisma.session.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SessionDeleteManyArgs>(args?: SelectSubset<T, SessionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Sessions
     * const session = await prisma.session.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SessionUpdateManyArgs>(args: SelectSubset<T, SessionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Session.
     * @param {SessionUpsertArgs} args - Arguments to update or create a Session.
     * @example
     * // Update or create a Session
     * const session = await prisma.session.upsert({
     *   create: {
     *     // ... data to create a Session
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Session we want to update
     *   }
     * })
     */
    upsert<T extends SessionUpsertArgs>(args: SelectSubset<T, SessionUpsertArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Sessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionCountArgs} args - Arguments to filter Sessions to count.
     * @example
     * // Count the number of Sessions
     * const count = await prisma.session.count({
     *   where: {
     *     // ... the filter for the Sessions we want to count
     *   }
     * })
    **/
    count<T extends SessionCountArgs>(
      args?: Subset<T, SessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Session.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SessionAggregateArgs>(args: Subset<T, SessionAggregateArgs>): Prisma.PrismaPromise<GetSessionAggregateType<T>>

    /**
     * Group by Session.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SessionGroupByArgs['orderBy'] }
        : { orderBy?: SessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Session model
   */
  readonly fields: SessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Session.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SessionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Session model
   */ 
  interface SessionFieldRefs {
    readonly id: FieldRef<"Session", 'String'>
    readonly userId: FieldRef<"Session", 'String'>
    readonly token: FieldRef<"Session", 'String'>
    readonly expiresAt: FieldRef<"Session", 'DateTime'>
    readonly createdAt: FieldRef<"Session", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Session findUnique
   */
  export type SessionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session findUniqueOrThrow
   */
  export type SessionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session findFirst
   */
  export type SessionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session findFirstOrThrow
   */
  export type SessionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session findMany
   */
  export type SessionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Sessions to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session create
   */
  export type SessionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The data needed to create a Session.
     */
    data: XOR<SessionCreateInput, SessionUncheckedCreateInput>
  }

  /**
   * Session createMany
   */
  export type SessionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Sessions.
     */
    data: SessionCreateManyInput | SessionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Session createManyAndReturn
   */
  export type SessionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Sessions.
     */
    data: SessionCreateManyInput | SessionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Session update
   */
  export type SessionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The data needed to update a Session.
     */
    data: XOR<SessionUpdateInput, SessionUncheckedUpdateInput>
    /**
     * Choose, which Session to update.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session updateMany
   */
  export type SessionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Sessions.
     */
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyInput>
    /**
     * Filter which Sessions to update
     */
    where?: SessionWhereInput
  }

  /**
   * Session upsert
   */
  export type SessionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The filter to search for the Session to update in case it exists.
     */
    where: SessionWhereUniqueInput
    /**
     * In case the Session found by the `where` argument doesn't exist, create a new Session with this data.
     */
    create: XOR<SessionCreateInput, SessionUncheckedCreateInput>
    /**
     * In case the Session was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SessionUpdateInput, SessionUncheckedUpdateInput>
  }

  /**
   * Session delete
   */
  export type SessionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter which Session to delete.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session deleteMany
   */
  export type SessionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Sessions to delete
     */
    where?: SessionWhereInput
  }

  /**
   * Session without action
   */
  export type SessionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
  }


  /**
   * Model Vehicle
   */

  export type AggregateVehicle = {
    _count: VehicleCountAggregateOutputType | null
    _min: VehicleMinAggregateOutputType | null
    _max: VehicleMaxAggregateOutputType | null
  }

  export type VehicleMinAggregateOutputType = {
    id: string | null
    name: string | null
    licensePlate: string | null
    type: string | null
    status: string | null
    userId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type VehicleMaxAggregateOutputType = {
    id: string | null
    name: string | null
    licensePlate: string | null
    type: string | null
    status: string | null
    userId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type VehicleCountAggregateOutputType = {
    id: number
    name: number
    licensePlate: number
    type: number
    status: number
    userId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type VehicleMinAggregateInputType = {
    id?: true
    name?: true
    licensePlate?: true
    type?: true
    status?: true
    userId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type VehicleMaxAggregateInputType = {
    id?: true
    name?: true
    licensePlate?: true
    type?: true
    status?: true
    userId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type VehicleCountAggregateInputType = {
    id?: true
    name?: true
    licensePlate?: true
    type?: true
    status?: true
    userId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type VehicleAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Vehicle to aggregate.
     */
    where?: VehicleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Vehicles to fetch.
     */
    orderBy?: VehicleOrderByWithRelationInput | VehicleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: VehicleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Vehicles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Vehicles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Vehicles
    **/
    _count?: true | VehicleCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: VehicleMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: VehicleMaxAggregateInputType
  }

  export type GetVehicleAggregateType<T extends VehicleAggregateArgs> = {
        [P in keyof T & keyof AggregateVehicle]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateVehicle[P]>
      : GetScalarType<T[P], AggregateVehicle[P]>
  }




  export type VehicleGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: VehicleWhereInput
    orderBy?: VehicleOrderByWithAggregationInput | VehicleOrderByWithAggregationInput[]
    by: VehicleScalarFieldEnum[] | VehicleScalarFieldEnum
    having?: VehicleScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: VehicleCountAggregateInputType | true
    _min?: VehicleMinAggregateInputType
    _max?: VehicleMaxAggregateInputType
  }

  export type VehicleGroupByOutputType = {
    id: string
    name: string
    licensePlate: string | null
    type: string
    status: string
    userId: string
    createdAt: Date
    updatedAt: Date
    _count: VehicleCountAggregateOutputType | null
    _min: VehicleMinAggregateOutputType | null
    _max: VehicleMaxAggregateOutputType | null
  }

  type GetVehicleGroupByPayload<T extends VehicleGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<VehicleGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof VehicleGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], VehicleGroupByOutputType[P]>
            : GetScalarType<T[P], VehicleGroupByOutputType[P]>
        }
      >
    >


  export type VehicleSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    licensePlate?: boolean
    type?: boolean
    status?: boolean
    userId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    locations?: boolean | Vehicle$locationsArgs<ExtArgs>
    routes?: boolean | Vehicle$routesArgs<ExtArgs>
    _count?: boolean | VehicleCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["vehicle"]>

  export type VehicleSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    licensePlate?: boolean
    type?: boolean
    status?: boolean
    userId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["vehicle"]>

  export type VehicleSelectScalar = {
    id?: boolean
    name?: boolean
    licensePlate?: boolean
    type?: boolean
    status?: boolean
    userId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type VehicleInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    locations?: boolean | Vehicle$locationsArgs<ExtArgs>
    routes?: boolean | Vehicle$routesArgs<ExtArgs>
    _count?: boolean | VehicleCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type VehicleIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $VehiclePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Vehicle"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      locations: Prisma.$LocationPayload<ExtArgs>[]
      routes: Prisma.$RoutePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      licensePlate: string | null
      type: string
      status: string
      userId: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["vehicle"]>
    composites: {}
  }

  type VehicleGetPayload<S extends boolean | null | undefined | VehicleDefaultArgs> = $Result.GetResult<Prisma.$VehiclePayload, S>

  type VehicleCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<VehicleFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: VehicleCountAggregateInputType | true
    }

  export interface VehicleDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Vehicle'], meta: { name: 'Vehicle' } }
    /**
     * Find zero or one Vehicle that matches the filter.
     * @param {VehicleFindUniqueArgs} args - Arguments to find a Vehicle
     * @example
     * // Get one Vehicle
     * const vehicle = await prisma.vehicle.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends VehicleFindUniqueArgs>(args: SelectSubset<T, VehicleFindUniqueArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Vehicle that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {VehicleFindUniqueOrThrowArgs} args - Arguments to find a Vehicle
     * @example
     * // Get one Vehicle
     * const vehicle = await prisma.vehicle.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends VehicleFindUniqueOrThrowArgs>(args: SelectSubset<T, VehicleFindUniqueOrThrowArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Vehicle that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VehicleFindFirstArgs} args - Arguments to find a Vehicle
     * @example
     * // Get one Vehicle
     * const vehicle = await prisma.vehicle.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends VehicleFindFirstArgs>(args?: SelectSubset<T, VehicleFindFirstArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Vehicle that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VehicleFindFirstOrThrowArgs} args - Arguments to find a Vehicle
     * @example
     * // Get one Vehicle
     * const vehicle = await prisma.vehicle.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends VehicleFindFirstOrThrowArgs>(args?: SelectSubset<T, VehicleFindFirstOrThrowArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Vehicles that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VehicleFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Vehicles
     * const vehicles = await prisma.vehicle.findMany()
     * 
     * // Get first 10 Vehicles
     * const vehicles = await prisma.vehicle.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const vehicleWithIdOnly = await prisma.vehicle.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends VehicleFindManyArgs>(args?: SelectSubset<T, VehicleFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Vehicle.
     * @param {VehicleCreateArgs} args - Arguments to create a Vehicle.
     * @example
     * // Create one Vehicle
     * const Vehicle = await prisma.vehicle.create({
     *   data: {
     *     // ... data to create a Vehicle
     *   }
     * })
     * 
     */
    create<T extends VehicleCreateArgs>(args: SelectSubset<T, VehicleCreateArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Vehicles.
     * @param {VehicleCreateManyArgs} args - Arguments to create many Vehicles.
     * @example
     * // Create many Vehicles
     * const vehicle = await prisma.vehicle.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends VehicleCreateManyArgs>(args?: SelectSubset<T, VehicleCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Vehicles and returns the data saved in the database.
     * @param {VehicleCreateManyAndReturnArgs} args - Arguments to create many Vehicles.
     * @example
     * // Create many Vehicles
     * const vehicle = await prisma.vehicle.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Vehicles and only return the `id`
     * const vehicleWithIdOnly = await prisma.vehicle.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends VehicleCreateManyAndReturnArgs>(args?: SelectSubset<T, VehicleCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Vehicle.
     * @param {VehicleDeleteArgs} args - Arguments to delete one Vehicle.
     * @example
     * // Delete one Vehicle
     * const Vehicle = await prisma.vehicle.delete({
     *   where: {
     *     // ... filter to delete one Vehicle
     *   }
     * })
     * 
     */
    delete<T extends VehicleDeleteArgs>(args: SelectSubset<T, VehicleDeleteArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Vehicle.
     * @param {VehicleUpdateArgs} args - Arguments to update one Vehicle.
     * @example
     * // Update one Vehicle
     * const vehicle = await prisma.vehicle.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends VehicleUpdateArgs>(args: SelectSubset<T, VehicleUpdateArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Vehicles.
     * @param {VehicleDeleteManyArgs} args - Arguments to filter Vehicles to delete.
     * @example
     * // Delete a few Vehicles
     * const { count } = await prisma.vehicle.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends VehicleDeleteManyArgs>(args?: SelectSubset<T, VehicleDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Vehicles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VehicleUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Vehicles
     * const vehicle = await prisma.vehicle.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends VehicleUpdateManyArgs>(args: SelectSubset<T, VehicleUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Vehicle.
     * @param {VehicleUpsertArgs} args - Arguments to update or create a Vehicle.
     * @example
     * // Update or create a Vehicle
     * const vehicle = await prisma.vehicle.upsert({
     *   create: {
     *     // ... data to create a Vehicle
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Vehicle we want to update
     *   }
     * })
     */
    upsert<T extends VehicleUpsertArgs>(args: SelectSubset<T, VehicleUpsertArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Vehicles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VehicleCountArgs} args - Arguments to filter Vehicles to count.
     * @example
     * // Count the number of Vehicles
     * const count = await prisma.vehicle.count({
     *   where: {
     *     // ... the filter for the Vehicles we want to count
     *   }
     * })
    **/
    count<T extends VehicleCountArgs>(
      args?: Subset<T, VehicleCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], VehicleCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Vehicle.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VehicleAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends VehicleAggregateArgs>(args: Subset<T, VehicleAggregateArgs>): Prisma.PrismaPromise<GetVehicleAggregateType<T>>

    /**
     * Group by Vehicle.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VehicleGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends VehicleGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: VehicleGroupByArgs['orderBy'] }
        : { orderBy?: VehicleGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, VehicleGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetVehicleGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Vehicle model
   */
  readonly fields: VehicleFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Vehicle.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__VehicleClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    locations<T extends Vehicle$locationsArgs<ExtArgs> = {}>(args?: Subset<T, Vehicle$locationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LocationPayload<ExtArgs>, T, "findMany"> | Null>
    routes<T extends Vehicle$routesArgs<ExtArgs> = {}>(args?: Subset<T, Vehicle$routesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Vehicle model
   */ 
  interface VehicleFieldRefs {
    readonly id: FieldRef<"Vehicle", 'String'>
    readonly name: FieldRef<"Vehicle", 'String'>
    readonly licensePlate: FieldRef<"Vehicle", 'String'>
    readonly type: FieldRef<"Vehicle", 'String'>
    readonly status: FieldRef<"Vehicle", 'String'>
    readonly userId: FieldRef<"Vehicle", 'String'>
    readonly createdAt: FieldRef<"Vehicle", 'DateTime'>
    readonly updatedAt: FieldRef<"Vehicle", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Vehicle findUnique
   */
  export type VehicleFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    /**
     * Filter, which Vehicle to fetch.
     */
    where: VehicleWhereUniqueInput
  }

  /**
   * Vehicle findUniqueOrThrow
   */
  export type VehicleFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    /**
     * Filter, which Vehicle to fetch.
     */
    where: VehicleWhereUniqueInput
  }

  /**
   * Vehicle findFirst
   */
  export type VehicleFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    /**
     * Filter, which Vehicle to fetch.
     */
    where?: VehicleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Vehicles to fetch.
     */
    orderBy?: VehicleOrderByWithRelationInput | VehicleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Vehicles.
     */
    cursor?: VehicleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Vehicles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Vehicles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Vehicles.
     */
    distinct?: VehicleScalarFieldEnum | VehicleScalarFieldEnum[]
  }

  /**
   * Vehicle findFirstOrThrow
   */
  export type VehicleFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    /**
     * Filter, which Vehicle to fetch.
     */
    where?: VehicleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Vehicles to fetch.
     */
    orderBy?: VehicleOrderByWithRelationInput | VehicleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Vehicles.
     */
    cursor?: VehicleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Vehicles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Vehicles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Vehicles.
     */
    distinct?: VehicleScalarFieldEnum | VehicleScalarFieldEnum[]
  }

  /**
   * Vehicle findMany
   */
  export type VehicleFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    /**
     * Filter, which Vehicles to fetch.
     */
    where?: VehicleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Vehicles to fetch.
     */
    orderBy?: VehicleOrderByWithRelationInput | VehicleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Vehicles.
     */
    cursor?: VehicleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Vehicles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Vehicles.
     */
    skip?: number
    distinct?: VehicleScalarFieldEnum | VehicleScalarFieldEnum[]
  }

  /**
   * Vehicle create
   */
  export type VehicleCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    /**
     * The data needed to create a Vehicle.
     */
    data: XOR<VehicleCreateInput, VehicleUncheckedCreateInput>
  }

  /**
   * Vehicle createMany
   */
  export type VehicleCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Vehicles.
     */
    data: VehicleCreateManyInput | VehicleCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Vehicle createManyAndReturn
   */
  export type VehicleCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Vehicles.
     */
    data: VehicleCreateManyInput | VehicleCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Vehicle update
   */
  export type VehicleUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    /**
     * The data needed to update a Vehicle.
     */
    data: XOR<VehicleUpdateInput, VehicleUncheckedUpdateInput>
    /**
     * Choose, which Vehicle to update.
     */
    where: VehicleWhereUniqueInput
  }

  /**
   * Vehicle updateMany
   */
  export type VehicleUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Vehicles.
     */
    data: XOR<VehicleUpdateManyMutationInput, VehicleUncheckedUpdateManyInput>
    /**
     * Filter which Vehicles to update
     */
    where?: VehicleWhereInput
  }

  /**
   * Vehicle upsert
   */
  export type VehicleUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    /**
     * The filter to search for the Vehicle to update in case it exists.
     */
    where: VehicleWhereUniqueInput
    /**
     * In case the Vehicle found by the `where` argument doesn't exist, create a new Vehicle with this data.
     */
    create: XOR<VehicleCreateInput, VehicleUncheckedCreateInput>
    /**
     * In case the Vehicle was found with the provided `where` argument, update it with this data.
     */
    update: XOR<VehicleUpdateInput, VehicleUncheckedUpdateInput>
  }

  /**
   * Vehicle delete
   */
  export type VehicleDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    /**
     * Filter which Vehicle to delete.
     */
    where: VehicleWhereUniqueInput
  }

  /**
   * Vehicle deleteMany
   */
  export type VehicleDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Vehicles to delete
     */
    where?: VehicleWhereInput
  }

  /**
   * Vehicle.locations
   */
  export type Vehicle$locationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Location
     */
    select?: LocationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LocationInclude<ExtArgs> | null
    where?: LocationWhereInput
    orderBy?: LocationOrderByWithRelationInput | LocationOrderByWithRelationInput[]
    cursor?: LocationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LocationScalarFieldEnum | LocationScalarFieldEnum[]
  }

  /**
   * Vehicle.routes
   */
  export type Vehicle$routesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    where?: RouteWhereInput
    orderBy?: RouteOrderByWithRelationInput | RouteOrderByWithRelationInput[]
    cursor?: RouteWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RouteScalarFieldEnum | RouteScalarFieldEnum[]
  }

  /**
   * Vehicle without action
   */
  export type VehicleDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
  }


  /**
   * Model Location
   */

  export type AggregateLocation = {
    _count: LocationCountAggregateOutputType | null
    _avg: LocationAvgAggregateOutputType | null
    _sum: LocationSumAggregateOutputType | null
    _min: LocationMinAggregateOutputType | null
    _max: LocationMaxAggregateOutputType | null
  }

  export type LocationAvgAggregateOutputType = {
    latitude: number | null
    longitude: number | null
    accuracy: number | null
    speed: number | null
    heading: number | null
  }

  export type LocationSumAggregateOutputType = {
    latitude: number | null
    longitude: number | null
    accuracy: number | null
    speed: number | null
    heading: number | null
  }

  export type LocationMinAggregateOutputType = {
    id: string | null
    vehicleId: string | null
    userId: string | null
    latitude: number | null
    longitude: number | null
    accuracy: number | null
    speed: number | null
    heading: number | null
    timestamp: Date | null
  }

  export type LocationMaxAggregateOutputType = {
    id: string | null
    vehicleId: string | null
    userId: string | null
    latitude: number | null
    longitude: number | null
    accuracy: number | null
    speed: number | null
    heading: number | null
    timestamp: Date | null
  }

  export type LocationCountAggregateOutputType = {
    id: number
    vehicleId: number
    userId: number
    latitude: number
    longitude: number
    accuracy: number
    speed: number
    heading: number
    timestamp: number
    _all: number
  }


  export type LocationAvgAggregateInputType = {
    latitude?: true
    longitude?: true
    accuracy?: true
    speed?: true
    heading?: true
  }

  export type LocationSumAggregateInputType = {
    latitude?: true
    longitude?: true
    accuracy?: true
    speed?: true
    heading?: true
  }

  export type LocationMinAggregateInputType = {
    id?: true
    vehicleId?: true
    userId?: true
    latitude?: true
    longitude?: true
    accuracy?: true
    speed?: true
    heading?: true
    timestamp?: true
  }

  export type LocationMaxAggregateInputType = {
    id?: true
    vehicleId?: true
    userId?: true
    latitude?: true
    longitude?: true
    accuracy?: true
    speed?: true
    heading?: true
    timestamp?: true
  }

  export type LocationCountAggregateInputType = {
    id?: true
    vehicleId?: true
    userId?: true
    latitude?: true
    longitude?: true
    accuracy?: true
    speed?: true
    heading?: true
    timestamp?: true
    _all?: true
  }

  export type LocationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Location to aggregate.
     */
    where?: LocationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Locations to fetch.
     */
    orderBy?: LocationOrderByWithRelationInput | LocationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: LocationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Locations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Locations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Locations
    **/
    _count?: true | LocationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: LocationAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: LocationSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LocationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LocationMaxAggregateInputType
  }

  export type GetLocationAggregateType<T extends LocationAggregateArgs> = {
        [P in keyof T & keyof AggregateLocation]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLocation[P]>
      : GetScalarType<T[P], AggregateLocation[P]>
  }




  export type LocationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LocationWhereInput
    orderBy?: LocationOrderByWithAggregationInput | LocationOrderByWithAggregationInput[]
    by: LocationScalarFieldEnum[] | LocationScalarFieldEnum
    having?: LocationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LocationCountAggregateInputType | true
    _avg?: LocationAvgAggregateInputType
    _sum?: LocationSumAggregateInputType
    _min?: LocationMinAggregateInputType
    _max?: LocationMaxAggregateInputType
  }

  export type LocationGroupByOutputType = {
    id: string
    vehicleId: string | null
    userId: string | null
    latitude: number
    longitude: number
    accuracy: number | null
    speed: number | null
    heading: number | null
    timestamp: Date
    _count: LocationCountAggregateOutputType | null
    _avg: LocationAvgAggregateOutputType | null
    _sum: LocationSumAggregateOutputType | null
    _min: LocationMinAggregateOutputType | null
    _max: LocationMaxAggregateOutputType | null
  }

  type GetLocationGroupByPayload<T extends LocationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LocationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LocationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LocationGroupByOutputType[P]>
            : GetScalarType<T[P], LocationGroupByOutputType[P]>
        }
      >
    >


  export type LocationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    vehicleId?: boolean
    userId?: boolean
    latitude?: boolean
    longitude?: boolean
    accuracy?: boolean
    speed?: boolean
    heading?: boolean
    timestamp?: boolean
    vehicle?: boolean | Location$vehicleArgs<ExtArgs>
    user?: boolean | Location$userArgs<ExtArgs>
  }, ExtArgs["result"]["location"]>

  export type LocationSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    vehicleId?: boolean
    userId?: boolean
    latitude?: boolean
    longitude?: boolean
    accuracy?: boolean
    speed?: boolean
    heading?: boolean
    timestamp?: boolean
    vehicle?: boolean | Location$vehicleArgs<ExtArgs>
    user?: boolean | Location$userArgs<ExtArgs>
  }, ExtArgs["result"]["location"]>

  export type LocationSelectScalar = {
    id?: boolean
    vehicleId?: boolean
    userId?: boolean
    latitude?: boolean
    longitude?: boolean
    accuracy?: boolean
    speed?: boolean
    heading?: boolean
    timestamp?: boolean
  }

  export type LocationInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    vehicle?: boolean | Location$vehicleArgs<ExtArgs>
    user?: boolean | Location$userArgs<ExtArgs>
  }
  export type LocationIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    vehicle?: boolean | Location$vehicleArgs<ExtArgs>
    user?: boolean | Location$userArgs<ExtArgs>
  }

  export type $LocationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Location"
    objects: {
      vehicle: Prisma.$VehiclePayload<ExtArgs> | null
      user: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      vehicleId: string | null
      userId: string | null
      latitude: number
      longitude: number
      accuracy: number | null
      speed: number | null
      heading: number | null
      timestamp: Date
    }, ExtArgs["result"]["location"]>
    composites: {}
  }

  type LocationGetPayload<S extends boolean | null | undefined | LocationDefaultArgs> = $Result.GetResult<Prisma.$LocationPayload, S>

  type LocationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<LocationFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: LocationCountAggregateInputType | true
    }

  export interface LocationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Location'], meta: { name: 'Location' } }
    /**
     * Find zero or one Location that matches the filter.
     * @param {LocationFindUniqueArgs} args - Arguments to find a Location
     * @example
     * // Get one Location
     * const location = await prisma.location.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends LocationFindUniqueArgs>(args: SelectSubset<T, LocationFindUniqueArgs<ExtArgs>>): Prisma__LocationClient<$Result.GetResult<Prisma.$LocationPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Location that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {LocationFindUniqueOrThrowArgs} args - Arguments to find a Location
     * @example
     * // Get one Location
     * const location = await prisma.location.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends LocationFindUniqueOrThrowArgs>(args: SelectSubset<T, LocationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__LocationClient<$Result.GetResult<Prisma.$LocationPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Location that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocationFindFirstArgs} args - Arguments to find a Location
     * @example
     * // Get one Location
     * const location = await prisma.location.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends LocationFindFirstArgs>(args?: SelectSubset<T, LocationFindFirstArgs<ExtArgs>>): Prisma__LocationClient<$Result.GetResult<Prisma.$LocationPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Location that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocationFindFirstOrThrowArgs} args - Arguments to find a Location
     * @example
     * // Get one Location
     * const location = await prisma.location.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends LocationFindFirstOrThrowArgs>(args?: SelectSubset<T, LocationFindFirstOrThrowArgs<ExtArgs>>): Prisma__LocationClient<$Result.GetResult<Prisma.$LocationPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Locations that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Locations
     * const locations = await prisma.location.findMany()
     * 
     * // Get first 10 Locations
     * const locations = await prisma.location.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const locationWithIdOnly = await prisma.location.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends LocationFindManyArgs>(args?: SelectSubset<T, LocationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LocationPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Location.
     * @param {LocationCreateArgs} args - Arguments to create a Location.
     * @example
     * // Create one Location
     * const Location = await prisma.location.create({
     *   data: {
     *     // ... data to create a Location
     *   }
     * })
     * 
     */
    create<T extends LocationCreateArgs>(args: SelectSubset<T, LocationCreateArgs<ExtArgs>>): Prisma__LocationClient<$Result.GetResult<Prisma.$LocationPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Locations.
     * @param {LocationCreateManyArgs} args - Arguments to create many Locations.
     * @example
     * // Create many Locations
     * const location = await prisma.location.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends LocationCreateManyArgs>(args?: SelectSubset<T, LocationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Locations and returns the data saved in the database.
     * @param {LocationCreateManyAndReturnArgs} args - Arguments to create many Locations.
     * @example
     * // Create many Locations
     * const location = await prisma.location.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Locations and only return the `id`
     * const locationWithIdOnly = await prisma.location.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends LocationCreateManyAndReturnArgs>(args?: SelectSubset<T, LocationCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LocationPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Location.
     * @param {LocationDeleteArgs} args - Arguments to delete one Location.
     * @example
     * // Delete one Location
     * const Location = await prisma.location.delete({
     *   where: {
     *     // ... filter to delete one Location
     *   }
     * })
     * 
     */
    delete<T extends LocationDeleteArgs>(args: SelectSubset<T, LocationDeleteArgs<ExtArgs>>): Prisma__LocationClient<$Result.GetResult<Prisma.$LocationPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Location.
     * @param {LocationUpdateArgs} args - Arguments to update one Location.
     * @example
     * // Update one Location
     * const location = await prisma.location.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends LocationUpdateArgs>(args: SelectSubset<T, LocationUpdateArgs<ExtArgs>>): Prisma__LocationClient<$Result.GetResult<Prisma.$LocationPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Locations.
     * @param {LocationDeleteManyArgs} args - Arguments to filter Locations to delete.
     * @example
     * // Delete a few Locations
     * const { count } = await prisma.location.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends LocationDeleteManyArgs>(args?: SelectSubset<T, LocationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Locations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Locations
     * const location = await prisma.location.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends LocationUpdateManyArgs>(args: SelectSubset<T, LocationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Location.
     * @param {LocationUpsertArgs} args - Arguments to update or create a Location.
     * @example
     * // Update or create a Location
     * const location = await prisma.location.upsert({
     *   create: {
     *     // ... data to create a Location
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Location we want to update
     *   }
     * })
     */
    upsert<T extends LocationUpsertArgs>(args: SelectSubset<T, LocationUpsertArgs<ExtArgs>>): Prisma__LocationClient<$Result.GetResult<Prisma.$LocationPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Locations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocationCountArgs} args - Arguments to filter Locations to count.
     * @example
     * // Count the number of Locations
     * const count = await prisma.location.count({
     *   where: {
     *     // ... the filter for the Locations we want to count
     *   }
     * })
    **/
    count<T extends LocationCountArgs>(
      args?: Subset<T, LocationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LocationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Location.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LocationAggregateArgs>(args: Subset<T, LocationAggregateArgs>): Prisma.PrismaPromise<GetLocationAggregateType<T>>

    /**
     * Group by Location.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LocationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends LocationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: LocationGroupByArgs['orderBy'] }
        : { orderBy?: LocationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, LocationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLocationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Location model
   */
  readonly fields: LocationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Location.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__LocationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    vehicle<T extends Location$vehicleArgs<ExtArgs> = {}>(args?: Subset<T, Location$vehicleArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    user<T extends Location$userArgs<ExtArgs> = {}>(args?: Subset<T, Location$userArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Location model
   */ 
  interface LocationFieldRefs {
    readonly id: FieldRef<"Location", 'String'>
    readonly vehicleId: FieldRef<"Location", 'String'>
    readonly userId: FieldRef<"Location", 'String'>
    readonly latitude: FieldRef<"Location", 'Float'>
    readonly longitude: FieldRef<"Location", 'Float'>
    readonly accuracy: FieldRef<"Location", 'Float'>
    readonly speed: FieldRef<"Location", 'Float'>
    readonly heading: FieldRef<"Location", 'Float'>
    readonly timestamp: FieldRef<"Location", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Location findUnique
   */
  export type LocationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Location
     */
    select?: LocationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LocationInclude<ExtArgs> | null
    /**
     * Filter, which Location to fetch.
     */
    where: LocationWhereUniqueInput
  }

  /**
   * Location findUniqueOrThrow
   */
  export type LocationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Location
     */
    select?: LocationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LocationInclude<ExtArgs> | null
    /**
     * Filter, which Location to fetch.
     */
    where: LocationWhereUniqueInput
  }

  /**
   * Location findFirst
   */
  export type LocationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Location
     */
    select?: LocationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LocationInclude<ExtArgs> | null
    /**
     * Filter, which Location to fetch.
     */
    where?: LocationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Locations to fetch.
     */
    orderBy?: LocationOrderByWithRelationInput | LocationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Locations.
     */
    cursor?: LocationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Locations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Locations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Locations.
     */
    distinct?: LocationScalarFieldEnum | LocationScalarFieldEnum[]
  }

  /**
   * Location findFirstOrThrow
   */
  export type LocationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Location
     */
    select?: LocationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LocationInclude<ExtArgs> | null
    /**
     * Filter, which Location to fetch.
     */
    where?: LocationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Locations to fetch.
     */
    orderBy?: LocationOrderByWithRelationInput | LocationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Locations.
     */
    cursor?: LocationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Locations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Locations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Locations.
     */
    distinct?: LocationScalarFieldEnum | LocationScalarFieldEnum[]
  }

  /**
   * Location findMany
   */
  export type LocationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Location
     */
    select?: LocationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LocationInclude<ExtArgs> | null
    /**
     * Filter, which Locations to fetch.
     */
    where?: LocationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Locations to fetch.
     */
    orderBy?: LocationOrderByWithRelationInput | LocationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Locations.
     */
    cursor?: LocationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Locations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Locations.
     */
    skip?: number
    distinct?: LocationScalarFieldEnum | LocationScalarFieldEnum[]
  }

  /**
   * Location create
   */
  export type LocationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Location
     */
    select?: LocationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LocationInclude<ExtArgs> | null
    /**
     * The data needed to create a Location.
     */
    data: XOR<LocationCreateInput, LocationUncheckedCreateInput>
  }

  /**
   * Location createMany
   */
  export type LocationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Locations.
     */
    data: LocationCreateManyInput | LocationCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Location createManyAndReturn
   */
  export type LocationCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Location
     */
    select?: LocationSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Locations.
     */
    data: LocationCreateManyInput | LocationCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LocationIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Location update
   */
  export type LocationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Location
     */
    select?: LocationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LocationInclude<ExtArgs> | null
    /**
     * The data needed to update a Location.
     */
    data: XOR<LocationUpdateInput, LocationUncheckedUpdateInput>
    /**
     * Choose, which Location to update.
     */
    where: LocationWhereUniqueInput
  }

  /**
   * Location updateMany
   */
  export type LocationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Locations.
     */
    data: XOR<LocationUpdateManyMutationInput, LocationUncheckedUpdateManyInput>
    /**
     * Filter which Locations to update
     */
    where?: LocationWhereInput
  }

  /**
   * Location upsert
   */
  export type LocationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Location
     */
    select?: LocationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LocationInclude<ExtArgs> | null
    /**
     * The filter to search for the Location to update in case it exists.
     */
    where: LocationWhereUniqueInput
    /**
     * In case the Location found by the `where` argument doesn't exist, create a new Location with this data.
     */
    create: XOR<LocationCreateInput, LocationUncheckedCreateInput>
    /**
     * In case the Location was found with the provided `where` argument, update it with this data.
     */
    update: XOR<LocationUpdateInput, LocationUncheckedUpdateInput>
  }

  /**
   * Location delete
   */
  export type LocationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Location
     */
    select?: LocationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LocationInclude<ExtArgs> | null
    /**
     * Filter which Location to delete.
     */
    where: LocationWhereUniqueInput
  }

  /**
   * Location deleteMany
   */
  export type LocationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Locations to delete
     */
    where?: LocationWhereInput
  }

  /**
   * Location.vehicle
   */
  export type Location$vehicleArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    where?: VehicleWhereInput
  }

  /**
   * Location.user
   */
  export type Location$userArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Location without action
   */
  export type LocationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Location
     */
    select?: LocationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LocationInclude<ExtArgs> | null
  }


  /**
   * Model Route
   */

  export type AggregateRoute = {
    _count: RouteCountAggregateOutputType | null
    _avg: RouteAvgAggregateOutputType | null
    _sum: RouteSumAggregateOutputType | null
    _min: RouteMinAggregateOutputType | null
    _max: RouteMaxAggregateOutputType | null
  }

  export type RouteAvgAggregateOutputType = {
    startLat: number | null
    startLng: number | null
    endLat: number | null
    endLng: number | null
    distance: number | null
    duration: number | null
  }

  export type RouteSumAggregateOutputType = {
    startLat: number | null
    startLng: number | null
    endLat: number | null
    endLng: number | null
    distance: number | null
    duration: number | null
  }

  export type RouteMinAggregateOutputType = {
    id: string | null
    vehicleId: string | null
    userId: string | null
    name: string | null
    startLat: number | null
    startLng: number | null
    endLat: number | null
    endLng: number | null
    distance: number | null
    duration: number | null
    polyline: string | null
    status: string | null
    startedAt: Date | null
    completedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RouteMaxAggregateOutputType = {
    id: string | null
    vehicleId: string | null
    userId: string | null
    name: string | null
    startLat: number | null
    startLng: number | null
    endLat: number | null
    endLng: number | null
    distance: number | null
    duration: number | null
    polyline: string | null
    status: string | null
    startedAt: Date | null
    completedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RouteCountAggregateOutputType = {
    id: number
    vehicleId: number
    userId: number
    name: number
    startLat: number
    startLng: number
    endLat: number
    endLng: number
    waypoints: number
    distance: number
    duration: number
    polyline: number
    status: number
    startedAt: number
    completedAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type RouteAvgAggregateInputType = {
    startLat?: true
    startLng?: true
    endLat?: true
    endLng?: true
    distance?: true
    duration?: true
  }

  export type RouteSumAggregateInputType = {
    startLat?: true
    startLng?: true
    endLat?: true
    endLng?: true
    distance?: true
    duration?: true
  }

  export type RouteMinAggregateInputType = {
    id?: true
    vehicleId?: true
    userId?: true
    name?: true
    startLat?: true
    startLng?: true
    endLat?: true
    endLng?: true
    distance?: true
    duration?: true
    polyline?: true
    status?: true
    startedAt?: true
    completedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RouteMaxAggregateInputType = {
    id?: true
    vehicleId?: true
    userId?: true
    name?: true
    startLat?: true
    startLng?: true
    endLat?: true
    endLng?: true
    distance?: true
    duration?: true
    polyline?: true
    status?: true
    startedAt?: true
    completedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RouteCountAggregateInputType = {
    id?: true
    vehicleId?: true
    userId?: true
    name?: true
    startLat?: true
    startLng?: true
    endLat?: true
    endLng?: true
    waypoints?: true
    distance?: true
    duration?: true
    polyline?: true
    status?: true
    startedAt?: true
    completedAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type RouteAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Route to aggregate.
     */
    where?: RouteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Routes to fetch.
     */
    orderBy?: RouteOrderByWithRelationInput | RouteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RouteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Routes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Routes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Routes
    **/
    _count?: true | RouteCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RouteAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RouteSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RouteMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RouteMaxAggregateInputType
  }

  export type GetRouteAggregateType<T extends RouteAggregateArgs> = {
        [P in keyof T & keyof AggregateRoute]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRoute[P]>
      : GetScalarType<T[P], AggregateRoute[P]>
  }




  export type RouteGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RouteWhereInput
    orderBy?: RouteOrderByWithAggregationInput | RouteOrderByWithAggregationInput[]
    by: RouteScalarFieldEnum[] | RouteScalarFieldEnum
    having?: RouteScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RouteCountAggregateInputType | true
    _avg?: RouteAvgAggregateInputType
    _sum?: RouteSumAggregateInputType
    _min?: RouteMinAggregateInputType
    _max?: RouteMaxAggregateInputType
  }

  export type RouteGroupByOutputType = {
    id: string
    vehicleId: string | null
    userId: string
    name: string | null
    startLat: number
    startLng: number
    endLat: number
    endLng: number
    waypoints: JsonValue | null
    distance: number | null
    duration: number | null
    polyline: string | null
    status: string
    startedAt: Date | null
    completedAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: RouteCountAggregateOutputType | null
    _avg: RouteAvgAggregateOutputType | null
    _sum: RouteSumAggregateOutputType | null
    _min: RouteMinAggregateOutputType | null
    _max: RouteMaxAggregateOutputType | null
  }

  type GetRouteGroupByPayload<T extends RouteGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RouteGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RouteGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RouteGroupByOutputType[P]>
            : GetScalarType<T[P], RouteGroupByOutputType[P]>
        }
      >
    >


  export type RouteSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    vehicleId?: boolean
    userId?: boolean
    name?: boolean
    startLat?: boolean
    startLng?: boolean
    endLat?: boolean
    endLng?: boolean
    waypoints?: boolean
    distance?: boolean
    duration?: boolean
    polyline?: boolean
    status?: boolean
    startedAt?: boolean
    completedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    vehicle?: boolean | Route$vehicleArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["route"]>

  export type RouteSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    vehicleId?: boolean
    userId?: boolean
    name?: boolean
    startLat?: boolean
    startLng?: boolean
    endLat?: boolean
    endLng?: boolean
    waypoints?: boolean
    distance?: boolean
    duration?: boolean
    polyline?: boolean
    status?: boolean
    startedAt?: boolean
    completedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    vehicle?: boolean | Route$vehicleArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["route"]>

  export type RouteSelectScalar = {
    id?: boolean
    vehicleId?: boolean
    userId?: boolean
    name?: boolean
    startLat?: boolean
    startLng?: boolean
    endLat?: boolean
    endLng?: boolean
    waypoints?: boolean
    distance?: boolean
    duration?: boolean
    polyline?: boolean
    status?: boolean
    startedAt?: boolean
    completedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type RouteInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    vehicle?: boolean | Route$vehicleArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type RouteIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    vehicle?: boolean | Route$vehicleArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $RoutePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Route"
    objects: {
      vehicle: Prisma.$VehiclePayload<ExtArgs> | null
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      vehicleId: string | null
      userId: string
      name: string | null
      startLat: number
      startLng: number
      endLat: number
      endLng: number
      waypoints: Prisma.JsonValue | null
      distance: number | null
      duration: number | null
      polyline: string | null
      status: string
      startedAt: Date | null
      completedAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["route"]>
    composites: {}
  }

  type RouteGetPayload<S extends boolean | null | undefined | RouteDefaultArgs> = $Result.GetResult<Prisma.$RoutePayload, S>

  type RouteCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<RouteFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: RouteCountAggregateInputType | true
    }

  export interface RouteDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Route'], meta: { name: 'Route' } }
    /**
     * Find zero or one Route that matches the filter.
     * @param {RouteFindUniqueArgs} args - Arguments to find a Route
     * @example
     * // Get one Route
     * const route = await prisma.route.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RouteFindUniqueArgs>(args: SelectSubset<T, RouteFindUniqueArgs<ExtArgs>>): Prisma__RouteClient<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Route that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {RouteFindUniqueOrThrowArgs} args - Arguments to find a Route
     * @example
     * // Get one Route
     * const route = await prisma.route.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RouteFindUniqueOrThrowArgs>(args: SelectSubset<T, RouteFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RouteClient<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Route that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteFindFirstArgs} args - Arguments to find a Route
     * @example
     * // Get one Route
     * const route = await prisma.route.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RouteFindFirstArgs>(args?: SelectSubset<T, RouteFindFirstArgs<ExtArgs>>): Prisma__RouteClient<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Route that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteFindFirstOrThrowArgs} args - Arguments to find a Route
     * @example
     * // Get one Route
     * const route = await prisma.route.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RouteFindFirstOrThrowArgs>(args?: SelectSubset<T, RouteFindFirstOrThrowArgs<ExtArgs>>): Prisma__RouteClient<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Routes that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Routes
     * const routes = await prisma.route.findMany()
     * 
     * // Get first 10 Routes
     * const routes = await prisma.route.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const routeWithIdOnly = await prisma.route.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RouteFindManyArgs>(args?: SelectSubset<T, RouteFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Route.
     * @param {RouteCreateArgs} args - Arguments to create a Route.
     * @example
     * // Create one Route
     * const Route = await prisma.route.create({
     *   data: {
     *     // ... data to create a Route
     *   }
     * })
     * 
     */
    create<T extends RouteCreateArgs>(args: SelectSubset<T, RouteCreateArgs<ExtArgs>>): Prisma__RouteClient<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Routes.
     * @param {RouteCreateManyArgs} args - Arguments to create many Routes.
     * @example
     * // Create many Routes
     * const route = await prisma.route.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RouteCreateManyArgs>(args?: SelectSubset<T, RouteCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Routes and returns the data saved in the database.
     * @param {RouteCreateManyAndReturnArgs} args - Arguments to create many Routes.
     * @example
     * // Create many Routes
     * const route = await prisma.route.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Routes and only return the `id`
     * const routeWithIdOnly = await prisma.route.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RouteCreateManyAndReturnArgs>(args?: SelectSubset<T, RouteCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Route.
     * @param {RouteDeleteArgs} args - Arguments to delete one Route.
     * @example
     * // Delete one Route
     * const Route = await prisma.route.delete({
     *   where: {
     *     // ... filter to delete one Route
     *   }
     * })
     * 
     */
    delete<T extends RouteDeleteArgs>(args: SelectSubset<T, RouteDeleteArgs<ExtArgs>>): Prisma__RouteClient<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Route.
     * @param {RouteUpdateArgs} args - Arguments to update one Route.
     * @example
     * // Update one Route
     * const route = await prisma.route.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RouteUpdateArgs>(args: SelectSubset<T, RouteUpdateArgs<ExtArgs>>): Prisma__RouteClient<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Routes.
     * @param {RouteDeleteManyArgs} args - Arguments to filter Routes to delete.
     * @example
     * // Delete a few Routes
     * const { count } = await prisma.route.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RouteDeleteManyArgs>(args?: SelectSubset<T, RouteDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Routes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Routes
     * const route = await prisma.route.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RouteUpdateManyArgs>(args: SelectSubset<T, RouteUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Route.
     * @param {RouteUpsertArgs} args - Arguments to update or create a Route.
     * @example
     * // Update or create a Route
     * const route = await prisma.route.upsert({
     *   create: {
     *     // ... data to create a Route
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Route we want to update
     *   }
     * })
     */
    upsert<T extends RouteUpsertArgs>(args: SelectSubset<T, RouteUpsertArgs<ExtArgs>>): Prisma__RouteClient<$Result.GetResult<Prisma.$RoutePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Routes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteCountArgs} args - Arguments to filter Routes to count.
     * @example
     * // Count the number of Routes
     * const count = await prisma.route.count({
     *   where: {
     *     // ... the filter for the Routes we want to count
     *   }
     * })
    **/
    count<T extends RouteCountArgs>(
      args?: Subset<T, RouteCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RouteCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Route.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RouteAggregateArgs>(args: Subset<T, RouteAggregateArgs>): Prisma.PrismaPromise<GetRouteAggregateType<T>>

    /**
     * Group by Route.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RouteGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RouteGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RouteGroupByArgs['orderBy'] }
        : { orderBy?: RouteGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RouteGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRouteGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Route model
   */
  readonly fields: RouteFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Route.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RouteClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    vehicle<T extends Route$vehicleArgs<ExtArgs> = {}>(args?: Subset<T, Route$vehicleArgs<ExtArgs>>): Prisma__VehicleClient<$Result.GetResult<Prisma.$VehiclePayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Route model
   */ 
  interface RouteFieldRefs {
    readonly id: FieldRef<"Route", 'String'>
    readonly vehicleId: FieldRef<"Route", 'String'>
    readonly userId: FieldRef<"Route", 'String'>
    readonly name: FieldRef<"Route", 'String'>
    readonly startLat: FieldRef<"Route", 'Float'>
    readonly startLng: FieldRef<"Route", 'Float'>
    readonly endLat: FieldRef<"Route", 'Float'>
    readonly endLng: FieldRef<"Route", 'Float'>
    readonly waypoints: FieldRef<"Route", 'Json'>
    readonly distance: FieldRef<"Route", 'Float'>
    readonly duration: FieldRef<"Route", 'Int'>
    readonly polyline: FieldRef<"Route", 'String'>
    readonly status: FieldRef<"Route", 'String'>
    readonly startedAt: FieldRef<"Route", 'DateTime'>
    readonly completedAt: FieldRef<"Route", 'DateTime'>
    readonly createdAt: FieldRef<"Route", 'DateTime'>
    readonly updatedAt: FieldRef<"Route", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Route findUnique
   */
  export type RouteFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    /**
     * Filter, which Route to fetch.
     */
    where: RouteWhereUniqueInput
  }

  /**
   * Route findUniqueOrThrow
   */
  export type RouteFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    /**
     * Filter, which Route to fetch.
     */
    where: RouteWhereUniqueInput
  }

  /**
   * Route findFirst
   */
  export type RouteFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    /**
     * Filter, which Route to fetch.
     */
    where?: RouteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Routes to fetch.
     */
    orderBy?: RouteOrderByWithRelationInput | RouteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Routes.
     */
    cursor?: RouteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Routes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Routes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Routes.
     */
    distinct?: RouteScalarFieldEnum | RouteScalarFieldEnum[]
  }

  /**
   * Route findFirstOrThrow
   */
  export type RouteFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    /**
     * Filter, which Route to fetch.
     */
    where?: RouteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Routes to fetch.
     */
    orderBy?: RouteOrderByWithRelationInput | RouteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Routes.
     */
    cursor?: RouteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Routes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Routes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Routes.
     */
    distinct?: RouteScalarFieldEnum | RouteScalarFieldEnum[]
  }

  /**
   * Route findMany
   */
  export type RouteFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    /**
     * Filter, which Routes to fetch.
     */
    where?: RouteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Routes to fetch.
     */
    orderBy?: RouteOrderByWithRelationInput | RouteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Routes.
     */
    cursor?: RouteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Routes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Routes.
     */
    skip?: number
    distinct?: RouteScalarFieldEnum | RouteScalarFieldEnum[]
  }

  /**
   * Route create
   */
  export type RouteCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    /**
     * The data needed to create a Route.
     */
    data: XOR<RouteCreateInput, RouteUncheckedCreateInput>
  }

  /**
   * Route createMany
   */
  export type RouteCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Routes.
     */
    data: RouteCreateManyInput | RouteCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Route createManyAndReturn
   */
  export type RouteCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Routes.
     */
    data: RouteCreateManyInput | RouteCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Route update
   */
  export type RouteUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    /**
     * The data needed to update a Route.
     */
    data: XOR<RouteUpdateInput, RouteUncheckedUpdateInput>
    /**
     * Choose, which Route to update.
     */
    where: RouteWhereUniqueInput
  }

  /**
   * Route updateMany
   */
  export type RouteUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Routes.
     */
    data: XOR<RouteUpdateManyMutationInput, RouteUncheckedUpdateManyInput>
    /**
     * Filter which Routes to update
     */
    where?: RouteWhereInput
  }

  /**
   * Route upsert
   */
  export type RouteUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    /**
     * The filter to search for the Route to update in case it exists.
     */
    where: RouteWhereUniqueInput
    /**
     * In case the Route found by the `where` argument doesn't exist, create a new Route with this data.
     */
    create: XOR<RouteCreateInput, RouteUncheckedCreateInput>
    /**
     * In case the Route was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RouteUpdateInput, RouteUncheckedUpdateInput>
  }

  /**
   * Route delete
   */
  export type RouteDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
    /**
     * Filter which Route to delete.
     */
    where: RouteWhereUniqueInput
  }

  /**
   * Route deleteMany
   */
  export type RouteDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Routes to delete
     */
    where?: RouteWhereInput
  }

  /**
   * Route.vehicle
   */
  export type Route$vehicleArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Vehicle
     */
    select?: VehicleSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VehicleInclude<ExtArgs> | null
    where?: VehicleWhereInput
  }

  /**
   * Route without action
   */
  export type RouteDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Route
     */
    select?: RouteSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RouteInclude<ExtArgs> | null
  }


  /**
   * Model Place
   */

  export type AggregatePlace = {
    _count: PlaceCountAggregateOutputType | null
    _avg: PlaceAvgAggregateOutputType | null
    _sum: PlaceSumAggregateOutputType | null
    _min: PlaceMinAggregateOutputType | null
    _max: PlaceMaxAggregateOutputType | null
  }

  export type PlaceAvgAggregateOutputType = {
    latitude: number | null
    longitude: number | null
    zoomLevel: number | null
    rating: number | null
    reviewCount: number | null
  }

  export type PlaceSumAggregateOutputType = {
    latitude: number | null
    longitude: number | null
    zoomLevel: number | null
    rating: number | null
    reviewCount: number | null
  }

  export type PlaceMinAggregateOutputType = {
    id: string | null
    name: string | null
    placeNameEn: string | null
    placeNameLocal: string | null
    category: string | null
    latitude: number | null
    longitude: number | null
    zoomLevel: number | null
    userId: string | null
    userName: string | null
    userEmail: string | null
    source: string | null
    approvalStatus: string | null
    approvedAt: Date | null
    autoApproveAt: Date | null
    googlePlaceId: string | null
    googleType: string | null
    googleMapsUrl: string | null
    vicinity: string | null
    fullAddress: string | null
    village: string | null
    taluk: string | null
    district: string | null
    state: string | null
    country: string | null
    pincode: string | null
    phone: string | null
    website: string | null
    rating: number | null
    reviewCount: number | null
    businessStatus: string | null
    description: string | null
    extractedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PlaceMaxAggregateOutputType = {
    id: string | null
    name: string | null
    placeNameEn: string | null
    placeNameLocal: string | null
    category: string | null
    latitude: number | null
    longitude: number | null
    zoomLevel: number | null
    userId: string | null
    userName: string | null
    userEmail: string | null
    source: string | null
    approvalStatus: string | null
    approvedAt: Date | null
    autoApproveAt: Date | null
    googlePlaceId: string | null
    googleType: string | null
    googleMapsUrl: string | null
    vicinity: string | null
    fullAddress: string | null
    village: string | null
    taluk: string | null
    district: string | null
    state: string | null
    country: string | null
    pincode: string | null
    phone: string | null
    website: string | null
    rating: number | null
    reviewCount: number | null
    businessStatus: string | null
    description: string | null
    extractedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PlaceCountAggregateOutputType = {
    id: number
    name: number
    placeNameEn: number
    placeNameLocal: number
    category: number
    latitude: number
    longitude: number
    zoomLevel: number
    userId: number
    userName: number
    userEmail: number
    source: number
    approvalStatus: number
    approvedAt: number
    autoApproveAt: number
    googlePlaceId: number
    googleType: number
    googleTypes: number
    googleMapsUrl: number
    vicinity: number
    fullAddress: number
    village: number
    taluk: number
    district: number
    state: number
    country: number
    pincode: number
    phone: number
    website: number
    rating: number
    reviewCount: number
    openingHours: number
    businessStatus: number
    description: number
    googleReviews: number
    nearbyPlaces: number
    googlePhotos: number
    mapRenderingConfig: number
    extractedAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type PlaceAvgAggregateInputType = {
    latitude?: true
    longitude?: true
    zoomLevel?: true
    rating?: true
    reviewCount?: true
  }

  export type PlaceSumAggregateInputType = {
    latitude?: true
    longitude?: true
    zoomLevel?: true
    rating?: true
    reviewCount?: true
  }

  export type PlaceMinAggregateInputType = {
    id?: true
    name?: true
    placeNameEn?: true
    placeNameLocal?: true
    category?: true
    latitude?: true
    longitude?: true
    zoomLevel?: true
    userId?: true
    userName?: true
    userEmail?: true
    source?: true
    approvalStatus?: true
    approvedAt?: true
    autoApproveAt?: true
    googlePlaceId?: true
    googleType?: true
    googleMapsUrl?: true
    vicinity?: true
    fullAddress?: true
    village?: true
    taluk?: true
    district?: true
    state?: true
    country?: true
    pincode?: true
    phone?: true
    website?: true
    rating?: true
    reviewCount?: true
    businessStatus?: true
    description?: true
    extractedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PlaceMaxAggregateInputType = {
    id?: true
    name?: true
    placeNameEn?: true
    placeNameLocal?: true
    category?: true
    latitude?: true
    longitude?: true
    zoomLevel?: true
    userId?: true
    userName?: true
    userEmail?: true
    source?: true
    approvalStatus?: true
    approvedAt?: true
    autoApproveAt?: true
    googlePlaceId?: true
    googleType?: true
    googleMapsUrl?: true
    vicinity?: true
    fullAddress?: true
    village?: true
    taluk?: true
    district?: true
    state?: true
    country?: true
    pincode?: true
    phone?: true
    website?: true
    rating?: true
    reviewCount?: true
    businessStatus?: true
    description?: true
    extractedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PlaceCountAggregateInputType = {
    id?: true
    name?: true
    placeNameEn?: true
    placeNameLocal?: true
    category?: true
    latitude?: true
    longitude?: true
    zoomLevel?: true
    userId?: true
    userName?: true
    userEmail?: true
    source?: true
    approvalStatus?: true
    approvedAt?: true
    autoApproveAt?: true
    googlePlaceId?: true
    googleType?: true
    googleTypes?: true
    googleMapsUrl?: true
    vicinity?: true
    fullAddress?: true
    village?: true
    taluk?: true
    district?: true
    state?: true
    country?: true
    pincode?: true
    phone?: true
    website?: true
    rating?: true
    reviewCount?: true
    openingHours?: true
    businessStatus?: true
    description?: true
    googleReviews?: true
    nearbyPlaces?: true
    googlePhotos?: true
    mapRenderingConfig?: true
    extractedAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type PlaceAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Place to aggregate.
     */
    where?: PlaceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Places to fetch.
     */
    orderBy?: PlaceOrderByWithRelationInput | PlaceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PlaceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Places from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Places.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Places
    **/
    _count?: true | PlaceCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PlaceAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PlaceSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PlaceMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PlaceMaxAggregateInputType
  }

  export type GetPlaceAggregateType<T extends PlaceAggregateArgs> = {
        [P in keyof T & keyof AggregatePlace]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePlace[P]>
      : GetScalarType<T[P], AggregatePlace[P]>
  }




  export type PlaceGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PlaceWhereInput
    orderBy?: PlaceOrderByWithAggregationInput | PlaceOrderByWithAggregationInput[]
    by: PlaceScalarFieldEnum[] | PlaceScalarFieldEnum
    having?: PlaceScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PlaceCountAggregateInputType | true
    _avg?: PlaceAvgAggregateInputType
    _sum?: PlaceSumAggregateInputType
    _min?: PlaceMinAggregateInputType
    _max?: PlaceMaxAggregateInputType
  }

  export type PlaceGroupByOutputType = {
    id: string
    name: string
    placeNameEn: string | null
    placeNameLocal: string | null
    category: string
    latitude: number
    longitude: number
    zoomLevel: number
    userId: string
    userName: string | null
    userEmail: string | null
    source: string
    approvalStatus: string
    approvedAt: Date | null
    autoApproveAt: Date | null
    googlePlaceId: string | null
    googleType: string | null
    googleTypes: JsonValue | null
    googleMapsUrl: string | null
    vicinity: string | null
    fullAddress: string | null
    village: string | null
    taluk: string | null
    district: string | null
    state: string | null
    country: string | null
    pincode: string | null
    phone: string | null
    website: string | null
    rating: number | null
    reviewCount: number | null
    openingHours: JsonValue | null
    businessStatus: string | null
    description: string | null
    googleReviews: JsonValue | null
    nearbyPlaces: JsonValue | null
    googlePhotos: JsonValue | null
    mapRenderingConfig: JsonValue | null
    extractedAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: PlaceCountAggregateOutputType | null
    _avg: PlaceAvgAggregateOutputType | null
    _sum: PlaceSumAggregateOutputType | null
    _min: PlaceMinAggregateOutputType | null
    _max: PlaceMaxAggregateOutputType | null
  }

  type GetPlaceGroupByPayload<T extends PlaceGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PlaceGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PlaceGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PlaceGroupByOutputType[P]>
            : GetScalarType<T[P], PlaceGroupByOutputType[P]>
        }
      >
    >


  export type PlaceSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    placeNameEn?: boolean
    placeNameLocal?: boolean
    category?: boolean
    latitude?: boolean
    longitude?: boolean
    zoomLevel?: boolean
    userId?: boolean
    userName?: boolean
    userEmail?: boolean
    source?: boolean
    approvalStatus?: boolean
    approvedAt?: boolean
    autoApproveAt?: boolean
    googlePlaceId?: boolean
    googleType?: boolean
    googleTypes?: boolean
    googleMapsUrl?: boolean
    vicinity?: boolean
    fullAddress?: boolean
    village?: boolean
    taluk?: boolean
    district?: boolean
    state?: boolean
    country?: boolean
    pincode?: boolean
    phone?: boolean
    website?: boolean
    rating?: boolean
    reviewCount?: boolean
    openingHours?: boolean
    businessStatus?: boolean
    description?: boolean
    googleReviews?: boolean
    nearbyPlaces?: boolean
    googlePhotos?: boolean
    mapRenderingConfig?: boolean
    extractedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    reviews?: boolean | Place$reviewsArgs<ExtArgs>
    photos?: boolean | Place$photosArgs<ExtArgs>
    _count?: boolean | PlaceCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["place"]>

  export type PlaceSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    placeNameEn?: boolean
    placeNameLocal?: boolean
    category?: boolean
    latitude?: boolean
    longitude?: boolean
    zoomLevel?: boolean
    userId?: boolean
    userName?: boolean
    userEmail?: boolean
    source?: boolean
    approvalStatus?: boolean
    approvedAt?: boolean
    autoApproveAt?: boolean
    googlePlaceId?: boolean
    googleType?: boolean
    googleTypes?: boolean
    googleMapsUrl?: boolean
    vicinity?: boolean
    fullAddress?: boolean
    village?: boolean
    taluk?: boolean
    district?: boolean
    state?: boolean
    country?: boolean
    pincode?: boolean
    phone?: boolean
    website?: boolean
    rating?: boolean
    reviewCount?: boolean
    openingHours?: boolean
    businessStatus?: boolean
    description?: boolean
    googleReviews?: boolean
    nearbyPlaces?: boolean
    googlePhotos?: boolean
    mapRenderingConfig?: boolean
    extractedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["place"]>

  export type PlaceSelectScalar = {
    id?: boolean
    name?: boolean
    placeNameEn?: boolean
    placeNameLocal?: boolean
    category?: boolean
    latitude?: boolean
    longitude?: boolean
    zoomLevel?: boolean
    userId?: boolean
    userName?: boolean
    userEmail?: boolean
    source?: boolean
    approvalStatus?: boolean
    approvedAt?: boolean
    autoApproveAt?: boolean
    googlePlaceId?: boolean
    googleType?: boolean
    googleTypes?: boolean
    googleMapsUrl?: boolean
    vicinity?: boolean
    fullAddress?: boolean
    village?: boolean
    taluk?: boolean
    district?: boolean
    state?: boolean
    country?: boolean
    pincode?: boolean
    phone?: boolean
    website?: boolean
    rating?: boolean
    reviewCount?: boolean
    openingHours?: boolean
    businessStatus?: boolean
    description?: boolean
    googleReviews?: boolean
    nearbyPlaces?: boolean
    googlePhotos?: boolean
    mapRenderingConfig?: boolean
    extractedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type PlaceInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    reviews?: boolean | Place$reviewsArgs<ExtArgs>
    photos?: boolean | Place$photosArgs<ExtArgs>
    _count?: boolean | PlaceCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type PlaceIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $PlacePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Place"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      reviews: Prisma.$PlaceReviewPayload<ExtArgs>[]
      photos: Prisma.$PlacePhotoPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      placeNameEn: string | null
      placeNameLocal: string | null
      category: string
      latitude: number
      longitude: number
      zoomLevel: number
      userId: string
      userName: string | null
      userEmail: string | null
      source: string
      approvalStatus: string
      approvedAt: Date | null
      autoApproveAt: Date | null
      googlePlaceId: string | null
      googleType: string | null
      googleTypes: Prisma.JsonValue | null
      googleMapsUrl: string | null
      vicinity: string | null
      fullAddress: string | null
      village: string | null
      taluk: string | null
      district: string | null
      state: string | null
      country: string | null
      pincode: string | null
      phone: string | null
      website: string | null
      rating: number | null
      reviewCount: number | null
      openingHours: Prisma.JsonValue | null
      businessStatus: string | null
      description: string | null
      googleReviews: Prisma.JsonValue | null
      nearbyPlaces: Prisma.JsonValue | null
      googlePhotos: Prisma.JsonValue | null
      mapRenderingConfig: Prisma.JsonValue | null
      extractedAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["place"]>
    composites: {}
  }

  type PlaceGetPayload<S extends boolean | null | undefined | PlaceDefaultArgs> = $Result.GetResult<Prisma.$PlacePayload, S>

  type PlaceCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<PlaceFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: PlaceCountAggregateInputType | true
    }

  export interface PlaceDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Place'], meta: { name: 'Place' } }
    /**
     * Find zero or one Place that matches the filter.
     * @param {PlaceFindUniqueArgs} args - Arguments to find a Place
     * @example
     * // Get one Place
     * const place = await prisma.place.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PlaceFindUniqueArgs>(args: SelectSubset<T, PlaceFindUniqueArgs<ExtArgs>>): Prisma__PlaceClient<$Result.GetResult<Prisma.$PlacePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Place that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {PlaceFindUniqueOrThrowArgs} args - Arguments to find a Place
     * @example
     * // Get one Place
     * const place = await prisma.place.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PlaceFindUniqueOrThrowArgs>(args: SelectSubset<T, PlaceFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PlaceClient<$Result.GetResult<Prisma.$PlacePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Place that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaceFindFirstArgs} args - Arguments to find a Place
     * @example
     * // Get one Place
     * const place = await prisma.place.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PlaceFindFirstArgs>(args?: SelectSubset<T, PlaceFindFirstArgs<ExtArgs>>): Prisma__PlaceClient<$Result.GetResult<Prisma.$PlacePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Place that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaceFindFirstOrThrowArgs} args - Arguments to find a Place
     * @example
     * // Get one Place
     * const place = await prisma.place.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PlaceFindFirstOrThrowArgs>(args?: SelectSubset<T, PlaceFindFirstOrThrowArgs<ExtArgs>>): Prisma__PlaceClient<$Result.GetResult<Prisma.$PlacePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Places that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaceFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Places
     * const places = await prisma.place.findMany()
     * 
     * // Get first 10 Places
     * const places = await prisma.place.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const placeWithIdOnly = await prisma.place.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PlaceFindManyArgs>(args?: SelectSubset<T, PlaceFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlacePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Place.
     * @param {PlaceCreateArgs} args - Arguments to create a Place.
     * @example
     * // Create one Place
     * const Place = await prisma.place.create({
     *   data: {
     *     // ... data to create a Place
     *   }
     * })
     * 
     */
    create<T extends PlaceCreateArgs>(args: SelectSubset<T, PlaceCreateArgs<ExtArgs>>): Prisma__PlaceClient<$Result.GetResult<Prisma.$PlacePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Places.
     * @param {PlaceCreateManyArgs} args - Arguments to create many Places.
     * @example
     * // Create many Places
     * const place = await prisma.place.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PlaceCreateManyArgs>(args?: SelectSubset<T, PlaceCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Places and returns the data saved in the database.
     * @param {PlaceCreateManyAndReturnArgs} args - Arguments to create many Places.
     * @example
     * // Create many Places
     * const place = await prisma.place.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Places and only return the `id`
     * const placeWithIdOnly = await prisma.place.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PlaceCreateManyAndReturnArgs>(args?: SelectSubset<T, PlaceCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlacePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Place.
     * @param {PlaceDeleteArgs} args - Arguments to delete one Place.
     * @example
     * // Delete one Place
     * const Place = await prisma.place.delete({
     *   where: {
     *     // ... filter to delete one Place
     *   }
     * })
     * 
     */
    delete<T extends PlaceDeleteArgs>(args: SelectSubset<T, PlaceDeleteArgs<ExtArgs>>): Prisma__PlaceClient<$Result.GetResult<Prisma.$PlacePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Place.
     * @param {PlaceUpdateArgs} args - Arguments to update one Place.
     * @example
     * // Update one Place
     * const place = await prisma.place.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PlaceUpdateArgs>(args: SelectSubset<T, PlaceUpdateArgs<ExtArgs>>): Prisma__PlaceClient<$Result.GetResult<Prisma.$PlacePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Places.
     * @param {PlaceDeleteManyArgs} args - Arguments to filter Places to delete.
     * @example
     * // Delete a few Places
     * const { count } = await prisma.place.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PlaceDeleteManyArgs>(args?: SelectSubset<T, PlaceDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Places.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaceUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Places
     * const place = await prisma.place.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PlaceUpdateManyArgs>(args: SelectSubset<T, PlaceUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Place.
     * @param {PlaceUpsertArgs} args - Arguments to update or create a Place.
     * @example
     * // Update or create a Place
     * const place = await prisma.place.upsert({
     *   create: {
     *     // ... data to create a Place
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Place we want to update
     *   }
     * })
     */
    upsert<T extends PlaceUpsertArgs>(args: SelectSubset<T, PlaceUpsertArgs<ExtArgs>>): Prisma__PlaceClient<$Result.GetResult<Prisma.$PlacePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Places.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaceCountArgs} args - Arguments to filter Places to count.
     * @example
     * // Count the number of Places
     * const count = await prisma.place.count({
     *   where: {
     *     // ... the filter for the Places we want to count
     *   }
     * })
    **/
    count<T extends PlaceCountArgs>(
      args?: Subset<T, PlaceCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PlaceCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Place.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaceAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PlaceAggregateArgs>(args: Subset<T, PlaceAggregateArgs>): Prisma.PrismaPromise<GetPlaceAggregateType<T>>

    /**
     * Group by Place.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaceGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PlaceGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PlaceGroupByArgs['orderBy'] }
        : { orderBy?: PlaceGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PlaceGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPlaceGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Place model
   */
  readonly fields: PlaceFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Place.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PlaceClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    reviews<T extends Place$reviewsArgs<ExtArgs> = {}>(args?: Subset<T, Place$reviewsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlaceReviewPayload<ExtArgs>, T, "findMany"> | Null>
    photos<T extends Place$photosArgs<ExtArgs> = {}>(args?: Subset<T, Place$photosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlacePhotoPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Place model
   */ 
  interface PlaceFieldRefs {
    readonly id: FieldRef<"Place", 'String'>
    readonly name: FieldRef<"Place", 'String'>
    readonly placeNameEn: FieldRef<"Place", 'String'>
    readonly placeNameLocal: FieldRef<"Place", 'String'>
    readonly category: FieldRef<"Place", 'String'>
    readonly latitude: FieldRef<"Place", 'Float'>
    readonly longitude: FieldRef<"Place", 'Float'>
    readonly zoomLevel: FieldRef<"Place", 'Float'>
    readonly userId: FieldRef<"Place", 'String'>
    readonly userName: FieldRef<"Place", 'String'>
    readonly userEmail: FieldRef<"Place", 'String'>
    readonly source: FieldRef<"Place", 'String'>
    readonly approvalStatus: FieldRef<"Place", 'String'>
    readonly approvedAt: FieldRef<"Place", 'DateTime'>
    readonly autoApproveAt: FieldRef<"Place", 'DateTime'>
    readonly googlePlaceId: FieldRef<"Place", 'String'>
    readonly googleType: FieldRef<"Place", 'String'>
    readonly googleTypes: FieldRef<"Place", 'Json'>
    readonly googleMapsUrl: FieldRef<"Place", 'String'>
    readonly vicinity: FieldRef<"Place", 'String'>
    readonly fullAddress: FieldRef<"Place", 'String'>
    readonly village: FieldRef<"Place", 'String'>
    readonly taluk: FieldRef<"Place", 'String'>
    readonly district: FieldRef<"Place", 'String'>
    readonly state: FieldRef<"Place", 'String'>
    readonly country: FieldRef<"Place", 'String'>
    readonly pincode: FieldRef<"Place", 'String'>
    readonly phone: FieldRef<"Place", 'String'>
    readonly website: FieldRef<"Place", 'String'>
    readonly rating: FieldRef<"Place", 'Float'>
    readonly reviewCount: FieldRef<"Place", 'Int'>
    readonly openingHours: FieldRef<"Place", 'Json'>
    readonly businessStatus: FieldRef<"Place", 'String'>
    readonly description: FieldRef<"Place", 'String'>
    readonly googleReviews: FieldRef<"Place", 'Json'>
    readonly nearbyPlaces: FieldRef<"Place", 'Json'>
    readonly googlePhotos: FieldRef<"Place", 'Json'>
    readonly mapRenderingConfig: FieldRef<"Place", 'Json'>
    readonly extractedAt: FieldRef<"Place", 'DateTime'>
    readonly createdAt: FieldRef<"Place", 'DateTime'>
    readonly updatedAt: FieldRef<"Place", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Place findUnique
   */
  export type PlaceFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Place
     */
    select?: PlaceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceInclude<ExtArgs> | null
    /**
     * Filter, which Place to fetch.
     */
    where: PlaceWhereUniqueInput
  }

  /**
   * Place findUniqueOrThrow
   */
  export type PlaceFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Place
     */
    select?: PlaceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceInclude<ExtArgs> | null
    /**
     * Filter, which Place to fetch.
     */
    where: PlaceWhereUniqueInput
  }

  /**
   * Place findFirst
   */
  export type PlaceFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Place
     */
    select?: PlaceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceInclude<ExtArgs> | null
    /**
     * Filter, which Place to fetch.
     */
    where?: PlaceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Places to fetch.
     */
    orderBy?: PlaceOrderByWithRelationInput | PlaceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Places.
     */
    cursor?: PlaceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Places from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Places.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Places.
     */
    distinct?: PlaceScalarFieldEnum | PlaceScalarFieldEnum[]
  }

  /**
   * Place findFirstOrThrow
   */
  export type PlaceFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Place
     */
    select?: PlaceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceInclude<ExtArgs> | null
    /**
     * Filter, which Place to fetch.
     */
    where?: PlaceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Places to fetch.
     */
    orderBy?: PlaceOrderByWithRelationInput | PlaceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Places.
     */
    cursor?: PlaceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Places from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Places.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Places.
     */
    distinct?: PlaceScalarFieldEnum | PlaceScalarFieldEnum[]
  }

  /**
   * Place findMany
   */
  export type PlaceFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Place
     */
    select?: PlaceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceInclude<ExtArgs> | null
    /**
     * Filter, which Places to fetch.
     */
    where?: PlaceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Places to fetch.
     */
    orderBy?: PlaceOrderByWithRelationInput | PlaceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Places.
     */
    cursor?: PlaceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Places from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Places.
     */
    skip?: number
    distinct?: PlaceScalarFieldEnum | PlaceScalarFieldEnum[]
  }

  /**
   * Place create
   */
  export type PlaceCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Place
     */
    select?: PlaceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceInclude<ExtArgs> | null
    /**
     * The data needed to create a Place.
     */
    data: XOR<PlaceCreateInput, PlaceUncheckedCreateInput>
  }

  /**
   * Place createMany
   */
  export type PlaceCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Places.
     */
    data: PlaceCreateManyInput | PlaceCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Place createManyAndReturn
   */
  export type PlaceCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Place
     */
    select?: PlaceSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Places.
     */
    data: PlaceCreateManyInput | PlaceCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Place update
   */
  export type PlaceUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Place
     */
    select?: PlaceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceInclude<ExtArgs> | null
    /**
     * The data needed to update a Place.
     */
    data: XOR<PlaceUpdateInput, PlaceUncheckedUpdateInput>
    /**
     * Choose, which Place to update.
     */
    where: PlaceWhereUniqueInput
  }

  /**
   * Place updateMany
   */
  export type PlaceUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Places.
     */
    data: XOR<PlaceUpdateManyMutationInput, PlaceUncheckedUpdateManyInput>
    /**
     * Filter which Places to update
     */
    where?: PlaceWhereInput
  }

  /**
   * Place upsert
   */
  export type PlaceUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Place
     */
    select?: PlaceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceInclude<ExtArgs> | null
    /**
     * The filter to search for the Place to update in case it exists.
     */
    where: PlaceWhereUniqueInput
    /**
     * In case the Place found by the `where` argument doesn't exist, create a new Place with this data.
     */
    create: XOR<PlaceCreateInput, PlaceUncheckedCreateInput>
    /**
     * In case the Place was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PlaceUpdateInput, PlaceUncheckedUpdateInput>
  }

  /**
   * Place delete
   */
  export type PlaceDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Place
     */
    select?: PlaceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceInclude<ExtArgs> | null
    /**
     * Filter which Place to delete.
     */
    where: PlaceWhereUniqueInput
  }

  /**
   * Place deleteMany
   */
  export type PlaceDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Places to delete
     */
    where?: PlaceWhereInput
  }

  /**
   * Place.reviews
   */
  export type Place$reviewsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaceReview
     */
    select?: PlaceReviewSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceReviewInclude<ExtArgs> | null
    where?: PlaceReviewWhereInput
    orderBy?: PlaceReviewOrderByWithRelationInput | PlaceReviewOrderByWithRelationInput[]
    cursor?: PlaceReviewWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PlaceReviewScalarFieldEnum | PlaceReviewScalarFieldEnum[]
  }

  /**
   * Place.photos
   */
  export type Place$photosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlacePhoto
     */
    select?: PlacePhotoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlacePhotoInclude<ExtArgs> | null
    where?: PlacePhotoWhereInput
    orderBy?: PlacePhotoOrderByWithRelationInput | PlacePhotoOrderByWithRelationInput[]
    cursor?: PlacePhotoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PlacePhotoScalarFieldEnum | PlacePhotoScalarFieldEnum[]
  }

  /**
   * Place without action
   */
  export type PlaceDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Place
     */
    select?: PlaceSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceInclude<ExtArgs> | null
  }


  /**
   * Model PlaceReview
   */

  export type AggregatePlaceReview = {
    _count: PlaceReviewCountAggregateOutputType | null
    _avg: PlaceReviewAvgAggregateOutputType | null
    _sum: PlaceReviewSumAggregateOutputType | null
    _min: PlaceReviewMinAggregateOutputType | null
    _max: PlaceReviewMaxAggregateOutputType | null
  }

  export type PlaceReviewAvgAggregateOutputType = {
    rating: number | null
  }

  export type PlaceReviewSumAggregateOutputType = {
    rating: number | null
  }

  export type PlaceReviewMinAggregateOutputType = {
    id: string | null
    placeId: string | null
    userId: string | null
    userName: string | null
    rating: number | null
    comment: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PlaceReviewMaxAggregateOutputType = {
    id: string | null
    placeId: string | null
    userId: string | null
    userName: string | null
    rating: number | null
    comment: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PlaceReviewCountAggregateOutputType = {
    id: number
    placeId: number
    userId: number
    userName: number
    rating: number
    comment: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type PlaceReviewAvgAggregateInputType = {
    rating?: true
  }

  export type PlaceReviewSumAggregateInputType = {
    rating?: true
  }

  export type PlaceReviewMinAggregateInputType = {
    id?: true
    placeId?: true
    userId?: true
    userName?: true
    rating?: true
    comment?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PlaceReviewMaxAggregateInputType = {
    id?: true
    placeId?: true
    userId?: true
    userName?: true
    rating?: true
    comment?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PlaceReviewCountAggregateInputType = {
    id?: true
    placeId?: true
    userId?: true
    userName?: true
    rating?: true
    comment?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type PlaceReviewAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PlaceReview to aggregate.
     */
    where?: PlaceReviewWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlaceReviews to fetch.
     */
    orderBy?: PlaceReviewOrderByWithRelationInput | PlaceReviewOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PlaceReviewWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlaceReviews from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlaceReviews.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PlaceReviews
    **/
    _count?: true | PlaceReviewCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PlaceReviewAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PlaceReviewSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PlaceReviewMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PlaceReviewMaxAggregateInputType
  }

  export type GetPlaceReviewAggregateType<T extends PlaceReviewAggregateArgs> = {
        [P in keyof T & keyof AggregatePlaceReview]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePlaceReview[P]>
      : GetScalarType<T[P], AggregatePlaceReview[P]>
  }




  export type PlaceReviewGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PlaceReviewWhereInput
    orderBy?: PlaceReviewOrderByWithAggregationInput | PlaceReviewOrderByWithAggregationInput[]
    by: PlaceReviewScalarFieldEnum[] | PlaceReviewScalarFieldEnum
    having?: PlaceReviewScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PlaceReviewCountAggregateInputType | true
    _avg?: PlaceReviewAvgAggregateInputType
    _sum?: PlaceReviewSumAggregateInputType
    _min?: PlaceReviewMinAggregateInputType
    _max?: PlaceReviewMaxAggregateInputType
  }

  export type PlaceReviewGroupByOutputType = {
    id: string
    placeId: string
    userId: string
    userName: string | null
    rating: number
    comment: string | null
    createdAt: Date
    updatedAt: Date
    _count: PlaceReviewCountAggregateOutputType | null
    _avg: PlaceReviewAvgAggregateOutputType | null
    _sum: PlaceReviewSumAggregateOutputType | null
    _min: PlaceReviewMinAggregateOutputType | null
    _max: PlaceReviewMaxAggregateOutputType | null
  }

  type GetPlaceReviewGroupByPayload<T extends PlaceReviewGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PlaceReviewGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PlaceReviewGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PlaceReviewGroupByOutputType[P]>
            : GetScalarType<T[P], PlaceReviewGroupByOutputType[P]>
        }
      >
    >


  export type PlaceReviewSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    placeId?: boolean
    userId?: boolean
    userName?: boolean
    rating?: boolean
    comment?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    place?: boolean | PlaceDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["placeReview"]>

  export type PlaceReviewSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    placeId?: boolean
    userId?: boolean
    userName?: boolean
    rating?: boolean
    comment?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    place?: boolean | PlaceDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["placeReview"]>

  export type PlaceReviewSelectScalar = {
    id?: boolean
    placeId?: boolean
    userId?: boolean
    userName?: boolean
    rating?: boolean
    comment?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type PlaceReviewInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    place?: boolean | PlaceDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type PlaceReviewIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    place?: boolean | PlaceDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $PlaceReviewPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PlaceReview"
    objects: {
      place: Prisma.$PlacePayload<ExtArgs>
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      placeId: string
      userId: string
      userName: string | null
      rating: number
      comment: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["placeReview"]>
    composites: {}
  }

  type PlaceReviewGetPayload<S extends boolean | null | undefined | PlaceReviewDefaultArgs> = $Result.GetResult<Prisma.$PlaceReviewPayload, S>

  type PlaceReviewCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<PlaceReviewFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: PlaceReviewCountAggregateInputType | true
    }

  export interface PlaceReviewDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PlaceReview'], meta: { name: 'PlaceReview' } }
    /**
     * Find zero or one PlaceReview that matches the filter.
     * @param {PlaceReviewFindUniqueArgs} args - Arguments to find a PlaceReview
     * @example
     * // Get one PlaceReview
     * const placeReview = await prisma.placeReview.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PlaceReviewFindUniqueArgs>(args: SelectSubset<T, PlaceReviewFindUniqueArgs<ExtArgs>>): Prisma__PlaceReviewClient<$Result.GetResult<Prisma.$PlaceReviewPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one PlaceReview that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {PlaceReviewFindUniqueOrThrowArgs} args - Arguments to find a PlaceReview
     * @example
     * // Get one PlaceReview
     * const placeReview = await prisma.placeReview.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PlaceReviewFindUniqueOrThrowArgs>(args: SelectSubset<T, PlaceReviewFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PlaceReviewClient<$Result.GetResult<Prisma.$PlaceReviewPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first PlaceReview that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaceReviewFindFirstArgs} args - Arguments to find a PlaceReview
     * @example
     * // Get one PlaceReview
     * const placeReview = await prisma.placeReview.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PlaceReviewFindFirstArgs>(args?: SelectSubset<T, PlaceReviewFindFirstArgs<ExtArgs>>): Prisma__PlaceReviewClient<$Result.GetResult<Prisma.$PlaceReviewPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first PlaceReview that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaceReviewFindFirstOrThrowArgs} args - Arguments to find a PlaceReview
     * @example
     * // Get one PlaceReview
     * const placeReview = await prisma.placeReview.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PlaceReviewFindFirstOrThrowArgs>(args?: SelectSubset<T, PlaceReviewFindFirstOrThrowArgs<ExtArgs>>): Prisma__PlaceReviewClient<$Result.GetResult<Prisma.$PlaceReviewPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more PlaceReviews that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaceReviewFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PlaceReviews
     * const placeReviews = await prisma.placeReview.findMany()
     * 
     * // Get first 10 PlaceReviews
     * const placeReviews = await prisma.placeReview.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const placeReviewWithIdOnly = await prisma.placeReview.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PlaceReviewFindManyArgs>(args?: SelectSubset<T, PlaceReviewFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlaceReviewPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a PlaceReview.
     * @param {PlaceReviewCreateArgs} args - Arguments to create a PlaceReview.
     * @example
     * // Create one PlaceReview
     * const PlaceReview = await prisma.placeReview.create({
     *   data: {
     *     // ... data to create a PlaceReview
     *   }
     * })
     * 
     */
    create<T extends PlaceReviewCreateArgs>(args: SelectSubset<T, PlaceReviewCreateArgs<ExtArgs>>): Prisma__PlaceReviewClient<$Result.GetResult<Prisma.$PlaceReviewPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many PlaceReviews.
     * @param {PlaceReviewCreateManyArgs} args - Arguments to create many PlaceReviews.
     * @example
     * // Create many PlaceReviews
     * const placeReview = await prisma.placeReview.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PlaceReviewCreateManyArgs>(args?: SelectSubset<T, PlaceReviewCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many PlaceReviews and returns the data saved in the database.
     * @param {PlaceReviewCreateManyAndReturnArgs} args - Arguments to create many PlaceReviews.
     * @example
     * // Create many PlaceReviews
     * const placeReview = await prisma.placeReview.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many PlaceReviews and only return the `id`
     * const placeReviewWithIdOnly = await prisma.placeReview.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PlaceReviewCreateManyAndReturnArgs>(args?: SelectSubset<T, PlaceReviewCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlaceReviewPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a PlaceReview.
     * @param {PlaceReviewDeleteArgs} args - Arguments to delete one PlaceReview.
     * @example
     * // Delete one PlaceReview
     * const PlaceReview = await prisma.placeReview.delete({
     *   where: {
     *     // ... filter to delete one PlaceReview
     *   }
     * })
     * 
     */
    delete<T extends PlaceReviewDeleteArgs>(args: SelectSubset<T, PlaceReviewDeleteArgs<ExtArgs>>): Prisma__PlaceReviewClient<$Result.GetResult<Prisma.$PlaceReviewPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one PlaceReview.
     * @param {PlaceReviewUpdateArgs} args - Arguments to update one PlaceReview.
     * @example
     * // Update one PlaceReview
     * const placeReview = await prisma.placeReview.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PlaceReviewUpdateArgs>(args: SelectSubset<T, PlaceReviewUpdateArgs<ExtArgs>>): Prisma__PlaceReviewClient<$Result.GetResult<Prisma.$PlaceReviewPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more PlaceReviews.
     * @param {PlaceReviewDeleteManyArgs} args - Arguments to filter PlaceReviews to delete.
     * @example
     * // Delete a few PlaceReviews
     * const { count } = await prisma.placeReview.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PlaceReviewDeleteManyArgs>(args?: SelectSubset<T, PlaceReviewDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PlaceReviews.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaceReviewUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PlaceReviews
     * const placeReview = await prisma.placeReview.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PlaceReviewUpdateManyArgs>(args: SelectSubset<T, PlaceReviewUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one PlaceReview.
     * @param {PlaceReviewUpsertArgs} args - Arguments to update or create a PlaceReview.
     * @example
     * // Update or create a PlaceReview
     * const placeReview = await prisma.placeReview.upsert({
     *   create: {
     *     // ... data to create a PlaceReview
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PlaceReview we want to update
     *   }
     * })
     */
    upsert<T extends PlaceReviewUpsertArgs>(args: SelectSubset<T, PlaceReviewUpsertArgs<ExtArgs>>): Prisma__PlaceReviewClient<$Result.GetResult<Prisma.$PlaceReviewPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of PlaceReviews.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaceReviewCountArgs} args - Arguments to filter PlaceReviews to count.
     * @example
     * // Count the number of PlaceReviews
     * const count = await prisma.placeReview.count({
     *   where: {
     *     // ... the filter for the PlaceReviews we want to count
     *   }
     * })
    **/
    count<T extends PlaceReviewCountArgs>(
      args?: Subset<T, PlaceReviewCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PlaceReviewCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PlaceReview.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaceReviewAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PlaceReviewAggregateArgs>(args: Subset<T, PlaceReviewAggregateArgs>): Prisma.PrismaPromise<GetPlaceReviewAggregateType<T>>

    /**
     * Group by PlaceReview.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaceReviewGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PlaceReviewGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PlaceReviewGroupByArgs['orderBy'] }
        : { orderBy?: PlaceReviewGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PlaceReviewGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPlaceReviewGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PlaceReview model
   */
  readonly fields: PlaceReviewFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PlaceReview.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PlaceReviewClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    place<T extends PlaceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, PlaceDefaultArgs<ExtArgs>>): Prisma__PlaceClient<$Result.GetResult<Prisma.$PlacePayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the PlaceReview model
   */ 
  interface PlaceReviewFieldRefs {
    readonly id: FieldRef<"PlaceReview", 'String'>
    readonly placeId: FieldRef<"PlaceReview", 'String'>
    readonly userId: FieldRef<"PlaceReview", 'String'>
    readonly userName: FieldRef<"PlaceReview", 'String'>
    readonly rating: FieldRef<"PlaceReview", 'Int'>
    readonly comment: FieldRef<"PlaceReview", 'String'>
    readonly createdAt: FieldRef<"PlaceReview", 'DateTime'>
    readonly updatedAt: FieldRef<"PlaceReview", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * PlaceReview findUnique
   */
  export type PlaceReviewFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaceReview
     */
    select?: PlaceReviewSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceReviewInclude<ExtArgs> | null
    /**
     * Filter, which PlaceReview to fetch.
     */
    where: PlaceReviewWhereUniqueInput
  }

  /**
   * PlaceReview findUniqueOrThrow
   */
  export type PlaceReviewFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaceReview
     */
    select?: PlaceReviewSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceReviewInclude<ExtArgs> | null
    /**
     * Filter, which PlaceReview to fetch.
     */
    where: PlaceReviewWhereUniqueInput
  }

  /**
   * PlaceReview findFirst
   */
  export type PlaceReviewFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaceReview
     */
    select?: PlaceReviewSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceReviewInclude<ExtArgs> | null
    /**
     * Filter, which PlaceReview to fetch.
     */
    where?: PlaceReviewWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlaceReviews to fetch.
     */
    orderBy?: PlaceReviewOrderByWithRelationInput | PlaceReviewOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PlaceReviews.
     */
    cursor?: PlaceReviewWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlaceReviews from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlaceReviews.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PlaceReviews.
     */
    distinct?: PlaceReviewScalarFieldEnum | PlaceReviewScalarFieldEnum[]
  }

  /**
   * PlaceReview findFirstOrThrow
   */
  export type PlaceReviewFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaceReview
     */
    select?: PlaceReviewSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceReviewInclude<ExtArgs> | null
    /**
     * Filter, which PlaceReview to fetch.
     */
    where?: PlaceReviewWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlaceReviews to fetch.
     */
    orderBy?: PlaceReviewOrderByWithRelationInput | PlaceReviewOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PlaceReviews.
     */
    cursor?: PlaceReviewWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlaceReviews from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlaceReviews.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PlaceReviews.
     */
    distinct?: PlaceReviewScalarFieldEnum | PlaceReviewScalarFieldEnum[]
  }

  /**
   * PlaceReview findMany
   */
  export type PlaceReviewFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaceReview
     */
    select?: PlaceReviewSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceReviewInclude<ExtArgs> | null
    /**
     * Filter, which PlaceReviews to fetch.
     */
    where?: PlaceReviewWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlaceReviews to fetch.
     */
    orderBy?: PlaceReviewOrderByWithRelationInput | PlaceReviewOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PlaceReviews.
     */
    cursor?: PlaceReviewWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlaceReviews from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlaceReviews.
     */
    skip?: number
    distinct?: PlaceReviewScalarFieldEnum | PlaceReviewScalarFieldEnum[]
  }

  /**
   * PlaceReview create
   */
  export type PlaceReviewCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaceReview
     */
    select?: PlaceReviewSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceReviewInclude<ExtArgs> | null
    /**
     * The data needed to create a PlaceReview.
     */
    data: XOR<PlaceReviewCreateInput, PlaceReviewUncheckedCreateInput>
  }

  /**
   * PlaceReview createMany
   */
  export type PlaceReviewCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PlaceReviews.
     */
    data: PlaceReviewCreateManyInput | PlaceReviewCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PlaceReview createManyAndReturn
   */
  export type PlaceReviewCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaceReview
     */
    select?: PlaceReviewSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many PlaceReviews.
     */
    data: PlaceReviewCreateManyInput | PlaceReviewCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceReviewIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * PlaceReview update
   */
  export type PlaceReviewUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaceReview
     */
    select?: PlaceReviewSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceReviewInclude<ExtArgs> | null
    /**
     * The data needed to update a PlaceReview.
     */
    data: XOR<PlaceReviewUpdateInput, PlaceReviewUncheckedUpdateInput>
    /**
     * Choose, which PlaceReview to update.
     */
    where: PlaceReviewWhereUniqueInput
  }

  /**
   * PlaceReview updateMany
   */
  export type PlaceReviewUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PlaceReviews.
     */
    data: XOR<PlaceReviewUpdateManyMutationInput, PlaceReviewUncheckedUpdateManyInput>
    /**
     * Filter which PlaceReviews to update
     */
    where?: PlaceReviewWhereInput
  }

  /**
   * PlaceReview upsert
   */
  export type PlaceReviewUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaceReview
     */
    select?: PlaceReviewSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceReviewInclude<ExtArgs> | null
    /**
     * The filter to search for the PlaceReview to update in case it exists.
     */
    where: PlaceReviewWhereUniqueInput
    /**
     * In case the PlaceReview found by the `where` argument doesn't exist, create a new PlaceReview with this data.
     */
    create: XOR<PlaceReviewCreateInput, PlaceReviewUncheckedCreateInput>
    /**
     * In case the PlaceReview was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PlaceReviewUpdateInput, PlaceReviewUncheckedUpdateInput>
  }

  /**
   * PlaceReview delete
   */
  export type PlaceReviewDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaceReview
     */
    select?: PlaceReviewSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceReviewInclude<ExtArgs> | null
    /**
     * Filter which PlaceReview to delete.
     */
    where: PlaceReviewWhereUniqueInput
  }

  /**
   * PlaceReview deleteMany
   */
  export type PlaceReviewDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PlaceReviews to delete
     */
    where?: PlaceReviewWhereInput
  }

  /**
   * PlaceReview without action
   */
  export type PlaceReviewDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaceReview
     */
    select?: PlaceReviewSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlaceReviewInclude<ExtArgs> | null
  }


  /**
   * Model PlacePhoto
   */

  export type AggregatePlacePhoto = {
    _count: PlacePhotoCountAggregateOutputType | null
    _min: PlacePhotoMinAggregateOutputType | null
    _max: PlacePhotoMaxAggregateOutputType | null
  }

  export type PlacePhotoMinAggregateOutputType = {
    id: string | null
    placeId: string | null
    userId: string | null
    userName: string | null
    dataUrl: string | null
    caption: string | null
    createdAt: Date | null
  }

  export type PlacePhotoMaxAggregateOutputType = {
    id: string | null
    placeId: string | null
    userId: string | null
    userName: string | null
    dataUrl: string | null
    caption: string | null
    createdAt: Date | null
  }

  export type PlacePhotoCountAggregateOutputType = {
    id: number
    placeId: number
    userId: number
    userName: number
    dataUrl: number
    caption: number
    createdAt: number
    _all: number
  }


  export type PlacePhotoMinAggregateInputType = {
    id?: true
    placeId?: true
    userId?: true
    userName?: true
    dataUrl?: true
    caption?: true
    createdAt?: true
  }

  export type PlacePhotoMaxAggregateInputType = {
    id?: true
    placeId?: true
    userId?: true
    userName?: true
    dataUrl?: true
    caption?: true
    createdAt?: true
  }

  export type PlacePhotoCountAggregateInputType = {
    id?: true
    placeId?: true
    userId?: true
    userName?: true
    dataUrl?: true
    caption?: true
    createdAt?: true
    _all?: true
  }

  export type PlacePhotoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PlacePhoto to aggregate.
     */
    where?: PlacePhotoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlacePhotos to fetch.
     */
    orderBy?: PlacePhotoOrderByWithRelationInput | PlacePhotoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PlacePhotoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlacePhotos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlacePhotos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PlacePhotos
    **/
    _count?: true | PlacePhotoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PlacePhotoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PlacePhotoMaxAggregateInputType
  }

  export type GetPlacePhotoAggregateType<T extends PlacePhotoAggregateArgs> = {
        [P in keyof T & keyof AggregatePlacePhoto]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePlacePhoto[P]>
      : GetScalarType<T[P], AggregatePlacePhoto[P]>
  }




  export type PlacePhotoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PlacePhotoWhereInput
    orderBy?: PlacePhotoOrderByWithAggregationInput | PlacePhotoOrderByWithAggregationInput[]
    by: PlacePhotoScalarFieldEnum[] | PlacePhotoScalarFieldEnum
    having?: PlacePhotoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PlacePhotoCountAggregateInputType | true
    _min?: PlacePhotoMinAggregateInputType
    _max?: PlacePhotoMaxAggregateInputType
  }

  export type PlacePhotoGroupByOutputType = {
    id: string
    placeId: string
    userId: string
    userName: string | null
    dataUrl: string
    caption: string | null
    createdAt: Date
    _count: PlacePhotoCountAggregateOutputType | null
    _min: PlacePhotoMinAggregateOutputType | null
    _max: PlacePhotoMaxAggregateOutputType | null
  }

  type GetPlacePhotoGroupByPayload<T extends PlacePhotoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PlacePhotoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PlacePhotoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PlacePhotoGroupByOutputType[P]>
            : GetScalarType<T[P], PlacePhotoGroupByOutputType[P]>
        }
      >
    >


  export type PlacePhotoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    placeId?: boolean
    userId?: boolean
    userName?: boolean
    dataUrl?: boolean
    caption?: boolean
    createdAt?: boolean
    place?: boolean | PlaceDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["placePhoto"]>

  export type PlacePhotoSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    placeId?: boolean
    userId?: boolean
    userName?: boolean
    dataUrl?: boolean
    caption?: boolean
    createdAt?: boolean
    place?: boolean | PlaceDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["placePhoto"]>

  export type PlacePhotoSelectScalar = {
    id?: boolean
    placeId?: boolean
    userId?: boolean
    userName?: boolean
    dataUrl?: boolean
    caption?: boolean
    createdAt?: boolean
  }

  export type PlacePhotoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    place?: boolean | PlaceDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type PlacePhotoIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    place?: boolean | PlaceDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $PlacePhotoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PlacePhoto"
    objects: {
      place: Prisma.$PlacePayload<ExtArgs>
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      placeId: string
      userId: string
      userName: string | null
      dataUrl: string
      caption: string | null
      createdAt: Date
    }, ExtArgs["result"]["placePhoto"]>
    composites: {}
  }

  type PlacePhotoGetPayload<S extends boolean | null | undefined | PlacePhotoDefaultArgs> = $Result.GetResult<Prisma.$PlacePhotoPayload, S>

  type PlacePhotoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<PlacePhotoFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: PlacePhotoCountAggregateInputType | true
    }

  export interface PlacePhotoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PlacePhoto'], meta: { name: 'PlacePhoto' } }
    /**
     * Find zero or one PlacePhoto that matches the filter.
     * @param {PlacePhotoFindUniqueArgs} args - Arguments to find a PlacePhoto
     * @example
     * // Get one PlacePhoto
     * const placePhoto = await prisma.placePhoto.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PlacePhotoFindUniqueArgs>(args: SelectSubset<T, PlacePhotoFindUniqueArgs<ExtArgs>>): Prisma__PlacePhotoClient<$Result.GetResult<Prisma.$PlacePhotoPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one PlacePhoto that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {PlacePhotoFindUniqueOrThrowArgs} args - Arguments to find a PlacePhoto
     * @example
     * // Get one PlacePhoto
     * const placePhoto = await prisma.placePhoto.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PlacePhotoFindUniqueOrThrowArgs>(args: SelectSubset<T, PlacePhotoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PlacePhotoClient<$Result.GetResult<Prisma.$PlacePhotoPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first PlacePhoto that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlacePhotoFindFirstArgs} args - Arguments to find a PlacePhoto
     * @example
     * // Get one PlacePhoto
     * const placePhoto = await prisma.placePhoto.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PlacePhotoFindFirstArgs>(args?: SelectSubset<T, PlacePhotoFindFirstArgs<ExtArgs>>): Prisma__PlacePhotoClient<$Result.GetResult<Prisma.$PlacePhotoPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first PlacePhoto that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlacePhotoFindFirstOrThrowArgs} args - Arguments to find a PlacePhoto
     * @example
     * // Get one PlacePhoto
     * const placePhoto = await prisma.placePhoto.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PlacePhotoFindFirstOrThrowArgs>(args?: SelectSubset<T, PlacePhotoFindFirstOrThrowArgs<ExtArgs>>): Prisma__PlacePhotoClient<$Result.GetResult<Prisma.$PlacePhotoPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more PlacePhotos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlacePhotoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PlacePhotos
     * const placePhotos = await prisma.placePhoto.findMany()
     * 
     * // Get first 10 PlacePhotos
     * const placePhotos = await prisma.placePhoto.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const placePhotoWithIdOnly = await prisma.placePhoto.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PlacePhotoFindManyArgs>(args?: SelectSubset<T, PlacePhotoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlacePhotoPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a PlacePhoto.
     * @param {PlacePhotoCreateArgs} args - Arguments to create a PlacePhoto.
     * @example
     * // Create one PlacePhoto
     * const PlacePhoto = await prisma.placePhoto.create({
     *   data: {
     *     // ... data to create a PlacePhoto
     *   }
     * })
     * 
     */
    create<T extends PlacePhotoCreateArgs>(args: SelectSubset<T, PlacePhotoCreateArgs<ExtArgs>>): Prisma__PlacePhotoClient<$Result.GetResult<Prisma.$PlacePhotoPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many PlacePhotos.
     * @param {PlacePhotoCreateManyArgs} args - Arguments to create many PlacePhotos.
     * @example
     * // Create many PlacePhotos
     * const placePhoto = await prisma.placePhoto.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PlacePhotoCreateManyArgs>(args?: SelectSubset<T, PlacePhotoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many PlacePhotos and returns the data saved in the database.
     * @param {PlacePhotoCreateManyAndReturnArgs} args - Arguments to create many PlacePhotos.
     * @example
     * // Create many PlacePhotos
     * const placePhoto = await prisma.placePhoto.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many PlacePhotos and only return the `id`
     * const placePhotoWithIdOnly = await prisma.placePhoto.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PlacePhotoCreateManyAndReturnArgs>(args?: SelectSubset<T, PlacePhotoCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlacePhotoPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a PlacePhoto.
     * @param {PlacePhotoDeleteArgs} args - Arguments to delete one PlacePhoto.
     * @example
     * // Delete one PlacePhoto
     * const PlacePhoto = await prisma.placePhoto.delete({
     *   where: {
     *     // ... filter to delete one PlacePhoto
     *   }
     * })
     * 
     */
    delete<T extends PlacePhotoDeleteArgs>(args: SelectSubset<T, PlacePhotoDeleteArgs<ExtArgs>>): Prisma__PlacePhotoClient<$Result.GetResult<Prisma.$PlacePhotoPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one PlacePhoto.
     * @param {PlacePhotoUpdateArgs} args - Arguments to update one PlacePhoto.
     * @example
     * // Update one PlacePhoto
     * const placePhoto = await prisma.placePhoto.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PlacePhotoUpdateArgs>(args: SelectSubset<T, PlacePhotoUpdateArgs<ExtArgs>>): Prisma__PlacePhotoClient<$Result.GetResult<Prisma.$PlacePhotoPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more PlacePhotos.
     * @param {PlacePhotoDeleteManyArgs} args - Arguments to filter PlacePhotos to delete.
     * @example
     * // Delete a few PlacePhotos
     * const { count } = await prisma.placePhoto.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PlacePhotoDeleteManyArgs>(args?: SelectSubset<T, PlacePhotoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PlacePhotos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlacePhotoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PlacePhotos
     * const placePhoto = await prisma.placePhoto.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PlacePhotoUpdateManyArgs>(args: SelectSubset<T, PlacePhotoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one PlacePhoto.
     * @param {PlacePhotoUpsertArgs} args - Arguments to update or create a PlacePhoto.
     * @example
     * // Update or create a PlacePhoto
     * const placePhoto = await prisma.placePhoto.upsert({
     *   create: {
     *     // ... data to create a PlacePhoto
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PlacePhoto we want to update
     *   }
     * })
     */
    upsert<T extends PlacePhotoUpsertArgs>(args: SelectSubset<T, PlacePhotoUpsertArgs<ExtArgs>>): Prisma__PlacePhotoClient<$Result.GetResult<Prisma.$PlacePhotoPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of PlacePhotos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlacePhotoCountArgs} args - Arguments to filter PlacePhotos to count.
     * @example
     * // Count the number of PlacePhotos
     * const count = await prisma.placePhoto.count({
     *   where: {
     *     // ... the filter for the PlacePhotos we want to count
     *   }
     * })
    **/
    count<T extends PlacePhotoCountArgs>(
      args?: Subset<T, PlacePhotoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PlacePhotoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PlacePhoto.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlacePhotoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PlacePhotoAggregateArgs>(args: Subset<T, PlacePhotoAggregateArgs>): Prisma.PrismaPromise<GetPlacePhotoAggregateType<T>>

    /**
     * Group by PlacePhoto.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlacePhotoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PlacePhotoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PlacePhotoGroupByArgs['orderBy'] }
        : { orderBy?: PlacePhotoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PlacePhotoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPlacePhotoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PlacePhoto model
   */
  readonly fields: PlacePhotoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PlacePhoto.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PlacePhotoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    place<T extends PlaceDefaultArgs<ExtArgs> = {}>(args?: Subset<T, PlaceDefaultArgs<ExtArgs>>): Prisma__PlaceClient<$Result.GetResult<Prisma.$PlacePayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the PlacePhoto model
   */ 
  interface PlacePhotoFieldRefs {
    readonly id: FieldRef<"PlacePhoto", 'String'>
    readonly placeId: FieldRef<"PlacePhoto", 'String'>
    readonly userId: FieldRef<"PlacePhoto", 'String'>
    readonly userName: FieldRef<"PlacePhoto", 'String'>
    readonly dataUrl: FieldRef<"PlacePhoto", 'String'>
    readonly caption: FieldRef<"PlacePhoto", 'String'>
    readonly createdAt: FieldRef<"PlacePhoto", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * PlacePhoto findUnique
   */
  export type PlacePhotoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlacePhoto
     */
    select?: PlacePhotoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlacePhotoInclude<ExtArgs> | null
    /**
     * Filter, which PlacePhoto to fetch.
     */
    where: PlacePhotoWhereUniqueInput
  }

  /**
   * PlacePhoto findUniqueOrThrow
   */
  export type PlacePhotoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlacePhoto
     */
    select?: PlacePhotoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlacePhotoInclude<ExtArgs> | null
    /**
     * Filter, which PlacePhoto to fetch.
     */
    where: PlacePhotoWhereUniqueInput
  }

  /**
   * PlacePhoto findFirst
   */
  export type PlacePhotoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlacePhoto
     */
    select?: PlacePhotoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlacePhotoInclude<ExtArgs> | null
    /**
     * Filter, which PlacePhoto to fetch.
     */
    where?: PlacePhotoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlacePhotos to fetch.
     */
    orderBy?: PlacePhotoOrderByWithRelationInput | PlacePhotoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PlacePhotos.
     */
    cursor?: PlacePhotoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlacePhotos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlacePhotos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PlacePhotos.
     */
    distinct?: PlacePhotoScalarFieldEnum | PlacePhotoScalarFieldEnum[]
  }

  /**
   * PlacePhoto findFirstOrThrow
   */
  export type PlacePhotoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlacePhoto
     */
    select?: PlacePhotoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlacePhotoInclude<ExtArgs> | null
    /**
     * Filter, which PlacePhoto to fetch.
     */
    where?: PlacePhotoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlacePhotos to fetch.
     */
    orderBy?: PlacePhotoOrderByWithRelationInput | PlacePhotoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PlacePhotos.
     */
    cursor?: PlacePhotoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlacePhotos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlacePhotos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PlacePhotos.
     */
    distinct?: PlacePhotoScalarFieldEnum | PlacePhotoScalarFieldEnum[]
  }

  /**
   * PlacePhoto findMany
   */
  export type PlacePhotoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlacePhoto
     */
    select?: PlacePhotoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlacePhotoInclude<ExtArgs> | null
    /**
     * Filter, which PlacePhotos to fetch.
     */
    where?: PlacePhotoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlacePhotos to fetch.
     */
    orderBy?: PlacePhotoOrderByWithRelationInput | PlacePhotoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PlacePhotos.
     */
    cursor?: PlacePhotoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlacePhotos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlacePhotos.
     */
    skip?: number
    distinct?: PlacePhotoScalarFieldEnum | PlacePhotoScalarFieldEnum[]
  }

  /**
   * PlacePhoto create
   */
  export type PlacePhotoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlacePhoto
     */
    select?: PlacePhotoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlacePhotoInclude<ExtArgs> | null
    /**
     * The data needed to create a PlacePhoto.
     */
    data: XOR<PlacePhotoCreateInput, PlacePhotoUncheckedCreateInput>
  }

  /**
   * PlacePhoto createMany
   */
  export type PlacePhotoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PlacePhotos.
     */
    data: PlacePhotoCreateManyInput | PlacePhotoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PlacePhoto createManyAndReturn
   */
  export type PlacePhotoCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlacePhoto
     */
    select?: PlacePhotoSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many PlacePhotos.
     */
    data: PlacePhotoCreateManyInput | PlacePhotoCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlacePhotoIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * PlacePhoto update
   */
  export type PlacePhotoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlacePhoto
     */
    select?: PlacePhotoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlacePhotoInclude<ExtArgs> | null
    /**
     * The data needed to update a PlacePhoto.
     */
    data: XOR<PlacePhotoUpdateInput, PlacePhotoUncheckedUpdateInput>
    /**
     * Choose, which PlacePhoto to update.
     */
    where: PlacePhotoWhereUniqueInput
  }

  /**
   * PlacePhoto updateMany
   */
  export type PlacePhotoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PlacePhotos.
     */
    data: XOR<PlacePhotoUpdateManyMutationInput, PlacePhotoUncheckedUpdateManyInput>
    /**
     * Filter which PlacePhotos to update
     */
    where?: PlacePhotoWhereInput
  }

  /**
   * PlacePhoto upsert
   */
  export type PlacePhotoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlacePhoto
     */
    select?: PlacePhotoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlacePhotoInclude<ExtArgs> | null
    /**
     * The filter to search for the PlacePhoto to update in case it exists.
     */
    where: PlacePhotoWhereUniqueInput
    /**
     * In case the PlacePhoto found by the `where` argument doesn't exist, create a new PlacePhoto with this data.
     */
    create: XOR<PlacePhotoCreateInput, PlacePhotoUncheckedCreateInput>
    /**
     * In case the PlacePhoto was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PlacePhotoUpdateInput, PlacePhotoUncheckedUpdateInput>
  }

  /**
   * PlacePhoto delete
   */
  export type PlacePhotoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlacePhoto
     */
    select?: PlacePhotoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlacePhotoInclude<ExtArgs> | null
    /**
     * Filter which PlacePhoto to delete.
     */
    where: PlacePhotoWhereUniqueInput
  }

  /**
   * PlacePhoto deleteMany
   */
  export type PlacePhotoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PlacePhotos to delete
     */
    where?: PlacePhotoWhereInput
  }

  /**
   * PlacePhoto without action
   */
  export type PlacePhotoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlacePhoto
     */
    select?: PlacePhotoSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PlacePhotoInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    name: 'name',
    email: 'email',
    password: 'password',
    googleId: 'googleId',
    picture: 'picture',
    emailVerified: 'emailVerified',
    lastGridExtractAt: 'lastGridExtractAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const OTPVerificationScalarFieldEnum: {
    id: 'id',
    email: 'email',
    otp: 'otp',
    type: 'type',
    expiresAt: 'expiresAt',
    verified: 'verified',
    createdAt: 'createdAt',
    userId: 'userId'
  };

  export type OTPVerificationScalarFieldEnum = (typeof OTPVerificationScalarFieldEnum)[keyof typeof OTPVerificationScalarFieldEnum]


  export const SessionScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    token: 'token',
    expiresAt: 'expiresAt',
    createdAt: 'createdAt'
  };

  export type SessionScalarFieldEnum = (typeof SessionScalarFieldEnum)[keyof typeof SessionScalarFieldEnum]


  export const VehicleScalarFieldEnum: {
    id: 'id',
    name: 'name',
    licensePlate: 'licensePlate',
    type: 'type',
    status: 'status',
    userId: 'userId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type VehicleScalarFieldEnum = (typeof VehicleScalarFieldEnum)[keyof typeof VehicleScalarFieldEnum]


  export const LocationScalarFieldEnum: {
    id: 'id',
    vehicleId: 'vehicleId',
    userId: 'userId',
    latitude: 'latitude',
    longitude: 'longitude',
    accuracy: 'accuracy',
    speed: 'speed',
    heading: 'heading',
    timestamp: 'timestamp'
  };

  export type LocationScalarFieldEnum = (typeof LocationScalarFieldEnum)[keyof typeof LocationScalarFieldEnum]


  export const RouteScalarFieldEnum: {
    id: 'id',
    vehicleId: 'vehicleId',
    userId: 'userId',
    name: 'name',
    startLat: 'startLat',
    startLng: 'startLng',
    endLat: 'endLat',
    endLng: 'endLng',
    waypoints: 'waypoints',
    distance: 'distance',
    duration: 'duration',
    polyline: 'polyline',
    status: 'status',
    startedAt: 'startedAt',
    completedAt: 'completedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type RouteScalarFieldEnum = (typeof RouteScalarFieldEnum)[keyof typeof RouteScalarFieldEnum]


  export const PlaceScalarFieldEnum: {
    id: 'id',
    name: 'name',
    placeNameEn: 'placeNameEn',
    placeNameLocal: 'placeNameLocal',
    category: 'category',
    latitude: 'latitude',
    longitude: 'longitude',
    zoomLevel: 'zoomLevel',
    userId: 'userId',
    userName: 'userName',
    userEmail: 'userEmail',
    source: 'source',
    approvalStatus: 'approvalStatus',
    approvedAt: 'approvedAt',
    autoApproveAt: 'autoApproveAt',
    googlePlaceId: 'googlePlaceId',
    googleType: 'googleType',
    googleTypes: 'googleTypes',
    googleMapsUrl: 'googleMapsUrl',
    vicinity: 'vicinity',
    fullAddress: 'fullAddress',
    village: 'village',
    taluk: 'taluk',
    district: 'district',
    state: 'state',
    country: 'country',
    pincode: 'pincode',
    phone: 'phone',
    website: 'website',
    rating: 'rating',
    reviewCount: 'reviewCount',
    openingHours: 'openingHours',
    businessStatus: 'businessStatus',
    description: 'description',
    googleReviews: 'googleReviews',
    nearbyPlaces: 'nearbyPlaces',
    googlePhotos: 'googlePhotos',
    mapRenderingConfig: 'mapRenderingConfig',
    extractedAt: 'extractedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type PlaceScalarFieldEnum = (typeof PlaceScalarFieldEnum)[keyof typeof PlaceScalarFieldEnum]


  export const PlaceReviewScalarFieldEnum: {
    id: 'id',
    placeId: 'placeId',
    userId: 'userId',
    userName: 'userName',
    rating: 'rating',
    comment: 'comment',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type PlaceReviewScalarFieldEnum = (typeof PlaceReviewScalarFieldEnum)[keyof typeof PlaceReviewScalarFieldEnum]


  export const PlacePhotoScalarFieldEnum: {
    id: 'id',
    placeId: 'placeId',
    userId: 'userId',
    userName: 'userName',
    dataUrl: 'dataUrl',
    caption: 'caption',
    createdAt: 'createdAt'
  };

  export type PlacePhotoScalarFieldEnum = (typeof PlacePhotoScalarFieldEnum)[keyof typeof PlacePhotoScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    name?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    password?: StringNullableFilter<"User"> | string | null
    googleId?: StringNullableFilter<"User"> | string | null
    picture?: StringNullableFilter<"User"> | string | null
    emailVerified?: BoolFilter<"User"> | boolean
    lastGridExtractAt?: DateTimeNullableFilter<"User"> | Date | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    otpVerifications?: OTPVerificationListRelationFilter
    sessions?: SessionListRelationFilter
    vehicles?: VehicleListRelationFilter
    locations?: LocationListRelationFilter
    routes?: RouteListRelationFilter
    places?: PlaceListRelationFilter
    placeReviews?: PlaceReviewListRelationFilter
    placePhotos?: PlacePhotoListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    password?: SortOrderInput | SortOrder
    googleId?: SortOrderInput | SortOrder
    picture?: SortOrderInput | SortOrder
    emailVerified?: SortOrder
    lastGridExtractAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    otpVerifications?: OTPVerificationOrderByRelationAggregateInput
    sessions?: SessionOrderByRelationAggregateInput
    vehicles?: VehicleOrderByRelationAggregateInput
    locations?: LocationOrderByRelationAggregateInput
    routes?: RouteOrderByRelationAggregateInput
    places?: PlaceOrderByRelationAggregateInput
    placeReviews?: PlaceReviewOrderByRelationAggregateInput
    placePhotos?: PlacePhotoOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    googleId?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    name?: StringFilter<"User"> | string
    password?: StringNullableFilter<"User"> | string | null
    picture?: StringNullableFilter<"User"> | string | null
    emailVerified?: BoolFilter<"User"> | boolean
    lastGridExtractAt?: DateTimeNullableFilter<"User"> | Date | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    otpVerifications?: OTPVerificationListRelationFilter
    sessions?: SessionListRelationFilter
    vehicles?: VehicleListRelationFilter
    locations?: LocationListRelationFilter
    routes?: RouteListRelationFilter
    places?: PlaceListRelationFilter
    placeReviews?: PlaceReviewListRelationFilter
    placePhotos?: PlacePhotoListRelationFilter
  }, "id" | "email" | "googleId">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    password?: SortOrderInput | SortOrder
    googleId?: SortOrderInput | SortOrder
    picture?: SortOrderInput | SortOrder
    emailVerified?: SortOrder
    lastGridExtractAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    name?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    password?: StringNullableWithAggregatesFilter<"User"> | string | null
    googleId?: StringNullableWithAggregatesFilter<"User"> | string | null
    picture?: StringNullableWithAggregatesFilter<"User"> | string | null
    emailVerified?: BoolWithAggregatesFilter<"User"> | boolean
    lastGridExtractAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type OTPVerificationWhereInput = {
    AND?: OTPVerificationWhereInput | OTPVerificationWhereInput[]
    OR?: OTPVerificationWhereInput[]
    NOT?: OTPVerificationWhereInput | OTPVerificationWhereInput[]
    id?: StringFilter<"OTPVerification"> | string
    email?: StringFilter<"OTPVerification"> | string
    otp?: StringFilter<"OTPVerification"> | string
    type?: StringFilter<"OTPVerification"> | string
    expiresAt?: DateTimeFilter<"OTPVerification"> | Date | string
    verified?: BoolFilter<"OTPVerification"> | boolean
    createdAt?: DateTimeFilter<"OTPVerification"> | Date | string
    userId?: StringNullableFilter<"OTPVerification"> | string | null
    user?: XOR<UserNullableRelationFilter, UserWhereInput> | null
  }

  export type OTPVerificationOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    otp?: SortOrder
    type?: SortOrder
    expiresAt?: SortOrder
    verified?: SortOrder
    createdAt?: SortOrder
    userId?: SortOrderInput | SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type OTPVerificationWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: OTPVerificationWhereInput | OTPVerificationWhereInput[]
    OR?: OTPVerificationWhereInput[]
    NOT?: OTPVerificationWhereInput | OTPVerificationWhereInput[]
    email?: StringFilter<"OTPVerification"> | string
    otp?: StringFilter<"OTPVerification"> | string
    type?: StringFilter<"OTPVerification"> | string
    expiresAt?: DateTimeFilter<"OTPVerification"> | Date | string
    verified?: BoolFilter<"OTPVerification"> | boolean
    createdAt?: DateTimeFilter<"OTPVerification"> | Date | string
    userId?: StringNullableFilter<"OTPVerification"> | string | null
    user?: XOR<UserNullableRelationFilter, UserWhereInput> | null
  }, "id">

  export type OTPVerificationOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
    otp?: SortOrder
    type?: SortOrder
    expiresAt?: SortOrder
    verified?: SortOrder
    createdAt?: SortOrder
    userId?: SortOrderInput | SortOrder
    _count?: OTPVerificationCountOrderByAggregateInput
    _max?: OTPVerificationMaxOrderByAggregateInput
    _min?: OTPVerificationMinOrderByAggregateInput
  }

  export type OTPVerificationScalarWhereWithAggregatesInput = {
    AND?: OTPVerificationScalarWhereWithAggregatesInput | OTPVerificationScalarWhereWithAggregatesInput[]
    OR?: OTPVerificationScalarWhereWithAggregatesInput[]
    NOT?: OTPVerificationScalarWhereWithAggregatesInput | OTPVerificationScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"OTPVerification"> | string
    email?: StringWithAggregatesFilter<"OTPVerification"> | string
    otp?: StringWithAggregatesFilter<"OTPVerification"> | string
    type?: StringWithAggregatesFilter<"OTPVerification"> | string
    expiresAt?: DateTimeWithAggregatesFilter<"OTPVerification"> | Date | string
    verified?: BoolWithAggregatesFilter<"OTPVerification"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"OTPVerification"> | Date | string
    userId?: StringNullableWithAggregatesFilter<"OTPVerification"> | string | null
  }

  export type SessionWhereInput = {
    AND?: SessionWhereInput | SessionWhereInput[]
    OR?: SessionWhereInput[]
    NOT?: SessionWhereInput | SessionWhereInput[]
    id?: StringFilter<"Session"> | string
    userId?: StringFilter<"Session"> | string
    token?: StringFilter<"Session"> | string
    expiresAt?: DateTimeFilter<"Session"> | Date | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
    user?: XOR<UserRelationFilter, UserWhereInput>
  }

  export type SessionOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    token?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type SessionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    token?: string
    AND?: SessionWhereInput | SessionWhereInput[]
    OR?: SessionWhereInput[]
    NOT?: SessionWhereInput | SessionWhereInput[]
    userId?: StringFilter<"Session"> | string
    expiresAt?: DateTimeFilter<"Session"> | Date | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
    user?: XOR<UserRelationFilter, UserWhereInput>
  }, "id" | "token">

  export type SessionOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    token?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    _count?: SessionCountOrderByAggregateInput
    _max?: SessionMaxOrderByAggregateInput
    _min?: SessionMinOrderByAggregateInput
  }

  export type SessionScalarWhereWithAggregatesInput = {
    AND?: SessionScalarWhereWithAggregatesInput | SessionScalarWhereWithAggregatesInput[]
    OR?: SessionScalarWhereWithAggregatesInput[]
    NOT?: SessionScalarWhereWithAggregatesInput | SessionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Session"> | string
    userId?: StringWithAggregatesFilter<"Session"> | string
    token?: StringWithAggregatesFilter<"Session"> | string
    expiresAt?: DateTimeWithAggregatesFilter<"Session"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"Session"> | Date | string
  }

  export type VehicleWhereInput = {
    AND?: VehicleWhereInput | VehicleWhereInput[]
    OR?: VehicleWhereInput[]
    NOT?: VehicleWhereInput | VehicleWhereInput[]
    id?: StringFilter<"Vehicle"> | string
    name?: StringFilter<"Vehicle"> | string
    licensePlate?: StringNullableFilter<"Vehicle"> | string | null
    type?: StringFilter<"Vehicle"> | string
    status?: StringFilter<"Vehicle"> | string
    userId?: StringFilter<"Vehicle"> | string
    createdAt?: DateTimeFilter<"Vehicle"> | Date | string
    updatedAt?: DateTimeFilter<"Vehicle"> | Date | string
    user?: XOR<UserRelationFilter, UserWhereInput>
    locations?: LocationListRelationFilter
    routes?: RouteListRelationFilter
  }

  export type VehicleOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    licensePlate?: SortOrderInput | SortOrder
    type?: SortOrder
    status?: SortOrder
    userId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    locations?: LocationOrderByRelationAggregateInput
    routes?: RouteOrderByRelationAggregateInput
  }

  export type VehicleWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    licensePlate?: string
    AND?: VehicleWhereInput | VehicleWhereInput[]
    OR?: VehicleWhereInput[]
    NOT?: VehicleWhereInput | VehicleWhereInput[]
    name?: StringFilter<"Vehicle"> | string
    type?: StringFilter<"Vehicle"> | string
    status?: StringFilter<"Vehicle"> | string
    userId?: StringFilter<"Vehicle"> | string
    createdAt?: DateTimeFilter<"Vehicle"> | Date | string
    updatedAt?: DateTimeFilter<"Vehicle"> | Date | string
    user?: XOR<UserRelationFilter, UserWhereInput>
    locations?: LocationListRelationFilter
    routes?: RouteListRelationFilter
  }, "id" | "licensePlate">

  export type VehicleOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    licensePlate?: SortOrderInput | SortOrder
    type?: SortOrder
    status?: SortOrder
    userId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: VehicleCountOrderByAggregateInput
    _max?: VehicleMaxOrderByAggregateInput
    _min?: VehicleMinOrderByAggregateInput
  }

  export type VehicleScalarWhereWithAggregatesInput = {
    AND?: VehicleScalarWhereWithAggregatesInput | VehicleScalarWhereWithAggregatesInput[]
    OR?: VehicleScalarWhereWithAggregatesInput[]
    NOT?: VehicleScalarWhereWithAggregatesInput | VehicleScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Vehicle"> | string
    name?: StringWithAggregatesFilter<"Vehicle"> | string
    licensePlate?: StringNullableWithAggregatesFilter<"Vehicle"> | string | null
    type?: StringWithAggregatesFilter<"Vehicle"> | string
    status?: StringWithAggregatesFilter<"Vehicle"> | string
    userId?: StringWithAggregatesFilter<"Vehicle"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Vehicle"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Vehicle"> | Date | string
  }

  export type LocationWhereInput = {
    AND?: LocationWhereInput | LocationWhereInput[]
    OR?: LocationWhereInput[]
    NOT?: LocationWhereInput | LocationWhereInput[]
    id?: StringFilter<"Location"> | string
    vehicleId?: StringNullableFilter<"Location"> | string | null
    userId?: StringNullableFilter<"Location"> | string | null
    latitude?: FloatFilter<"Location"> | number
    longitude?: FloatFilter<"Location"> | number
    accuracy?: FloatNullableFilter<"Location"> | number | null
    speed?: FloatNullableFilter<"Location"> | number | null
    heading?: FloatNullableFilter<"Location"> | number | null
    timestamp?: DateTimeFilter<"Location"> | Date | string
    vehicle?: XOR<VehicleNullableRelationFilter, VehicleWhereInput> | null
    user?: XOR<UserNullableRelationFilter, UserWhereInput> | null
  }

  export type LocationOrderByWithRelationInput = {
    id?: SortOrder
    vehicleId?: SortOrderInput | SortOrder
    userId?: SortOrderInput | SortOrder
    latitude?: SortOrder
    longitude?: SortOrder
    accuracy?: SortOrderInput | SortOrder
    speed?: SortOrderInput | SortOrder
    heading?: SortOrderInput | SortOrder
    timestamp?: SortOrder
    vehicle?: VehicleOrderByWithRelationInput
    user?: UserOrderByWithRelationInput
  }

  export type LocationWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: LocationWhereInput | LocationWhereInput[]
    OR?: LocationWhereInput[]
    NOT?: LocationWhereInput | LocationWhereInput[]
    vehicleId?: StringNullableFilter<"Location"> | string | null
    userId?: StringNullableFilter<"Location"> | string | null
    latitude?: FloatFilter<"Location"> | number
    longitude?: FloatFilter<"Location"> | number
    accuracy?: FloatNullableFilter<"Location"> | number | null
    speed?: FloatNullableFilter<"Location"> | number | null
    heading?: FloatNullableFilter<"Location"> | number | null
    timestamp?: DateTimeFilter<"Location"> | Date | string
    vehicle?: XOR<VehicleNullableRelationFilter, VehicleWhereInput> | null
    user?: XOR<UserNullableRelationFilter, UserWhereInput> | null
  }, "id">

  export type LocationOrderByWithAggregationInput = {
    id?: SortOrder
    vehicleId?: SortOrderInput | SortOrder
    userId?: SortOrderInput | SortOrder
    latitude?: SortOrder
    longitude?: SortOrder
    accuracy?: SortOrderInput | SortOrder
    speed?: SortOrderInput | SortOrder
    heading?: SortOrderInput | SortOrder
    timestamp?: SortOrder
    _count?: LocationCountOrderByAggregateInput
    _avg?: LocationAvgOrderByAggregateInput
    _max?: LocationMaxOrderByAggregateInput
    _min?: LocationMinOrderByAggregateInput
    _sum?: LocationSumOrderByAggregateInput
  }

  export type LocationScalarWhereWithAggregatesInput = {
    AND?: LocationScalarWhereWithAggregatesInput | LocationScalarWhereWithAggregatesInput[]
    OR?: LocationScalarWhereWithAggregatesInput[]
    NOT?: LocationScalarWhereWithAggregatesInput | LocationScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Location"> | string
    vehicleId?: StringNullableWithAggregatesFilter<"Location"> | string | null
    userId?: StringNullableWithAggregatesFilter<"Location"> | string | null
    latitude?: FloatWithAggregatesFilter<"Location"> | number
    longitude?: FloatWithAggregatesFilter<"Location"> | number
    accuracy?: FloatNullableWithAggregatesFilter<"Location"> | number | null
    speed?: FloatNullableWithAggregatesFilter<"Location"> | number | null
    heading?: FloatNullableWithAggregatesFilter<"Location"> | number | null
    timestamp?: DateTimeWithAggregatesFilter<"Location"> | Date | string
  }

  export type RouteWhereInput = {
    AND?: RouteWhereInput | RouteWhereInput[]
    OR?: RouteWhereInput[]
    NOT?: RouteWhereInput | RouteWhereInput[]
    id?: StringFilter<"Route"> | string
    vehicleId?: StringNullableFilter<"Route"> | string | null
    userId?: StringFilter<"Route"> | string
    name?: StringNullableFilter<"Route"> | string | null
    startLat?: FloatFilter<"Route"> | number
    startLng?: FloatFilter<"Route"> | number
    endLat?: FloatFilter<"Route"> | number
    endLng?: FloatFilter<"Route"> | number
    waypoints?: JsonNullableFilter<"Route">
    distance?: FloatNullableFilter<"Route"> | number | null
    duration?: IntNullableFilter<"Route"> | number | null
    polyline?: StringNullableFilter<"Route"> | string | null
    status?: StringFilter<"Route"> | string
    startedAt?: DateTimeNullableFilter<"Route"> | Date | string | null
    completedAt?: DateTimeNullableFilter<"Route"> | Date | string | null
    createdAt?: DateTimeFilter<"Route"> | Date | string
    updatedAt?: DateTimeFilter<"Route"> | Date | string
    vehicle?: XOR<VehicleNullableRelationFilter, VehicleWhereInput> | null
    user?: XOR<UserRelationFilter, UserWhereInput>
  }

  export type RouteOrderByWithRelationInput = {
    id?: SortOrder
    vehicleId?: SortOrderInput | SortOrder
    userId?: SortOrder
    name?: SortOrderInput | SortOrder
    startLat?: SortOrder
    startLng?: SortOrder
    endLat?: SortOrder
    endLng?: SortOrder
    waypoints?: SortOrderInput | SortOrder
    distance?: SortOrderInput | SortOrder
    duration?: SortOrderInput | SortOrder
    polyline?: SortOrderInput | SortOrder
    status?: SortOrder
    startedAt?: SortOrderInput | SortOrder
    completedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    vehicle?: VehicleOrderByWithRelationInput
    user?: UserOrderByWithRelationInput
  }

  export type RouteWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: RouteWhereInput | RouteWhereInput[]
    OR?: RouteWhereInput[]
    NOT?: RouteWhereInput | RouteWhereInput[]
    vehicleId?: StringNullableFilter<"Route"> | string | null
    userId?: StringFilter<"Route"> | string
    name?: StringNullableFilter<"Route"> | string | null
    startLat?: FloatFilter<"Route"> | number
    startLng?: FloatFilter<"Route"> | number
    endLat?: FloatFilter<"Route"> | number
    endLng?: FloatFilter<"Route"> | number
    waypoints?: JsonNullableFilter<"Route">
    distance?: FloatNullableFilter<"Route"> | number | null
    duration?: IntNullableFilter<"Route"> | number | null
    polyline?: StringNullableFilter<"Route"> | string | null
    status?: StringFilter<"Route"> | string
    startedAt?: DateTimeNullableFilter<"Route"> | Date | string | null
    completedAt?: DateTimeNullableFilter<"Route"> | Date | string | null
    createdAt?: DateTimeFilter<"Route"> | Date | string
    updatedAt?: DateTimeFilter<"Route"> | Date | string
    vehicle?: XOR<VehicleNullableRelationFilter, VehicleWhereInput> | null
    user?: XOR<UserRelationFilter, UserWhereInput>
  }, "id">

  export type RouteOrderByWithAggregationInput = {
    id?: SortOrder
    vehicleId?: SortOrderInput | SortOrder
    userId?: SortOrder
    name?: SortOrderInput | SortOrder
    startLat?: SortOrder
    startLng?: SortOrder
    endLat?: SortOrder
    endLng?: SortOrder
    waypoints?: SortOrderInput | SortOrder
    distance?: SortOrderInput | SortOrder
    duration?: SortOrderInput | SortOrder
    polyline?: SortOrderInput | SortOrder
    status?: SortOrder
    startedAt?: SortOrderInput | SortOrder
    completedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: RouteCountOrderByAggregateInput
    _avg?: RouteAvgOrderByAggregateInput
    _max?: RouteMaxOrderByAggregateInput
    _min?: RouteMinOrderByAggregateInput
    _sum?: RouteSumOrderByAggregateInput
  }

  export type RouteScalarWhereWithAggregatesInput = {
    AND?: RouteScalarWhereWithAggregatesInput | RouteScalarWhereWithAggregatesInput[]
    OR?: RouteScalarWhereWithAggregatesInput[]
    NOT?: RouteScalarWhereWithAggregatesInput | RouteScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Route"> | string
    vehicleId?: StringNullableWithAggregatesFilter<"Route"> | string | null
    userId?: StringWithAggregatesFilter<"Route"> | string
    name?: StringNullableWithAggregatesFilter<"Route"> | string | null
    startLat?: FloatWithAggregatesFilter<"Route"> | number
    startLng?: FloatWithAggregatesFilter<"Route"> | number
    endLat?: FloatWithAggregatesFilter<"Route"> | number
    endLng?: FloatWithAggregatesFilter<"Route"> | number
    waypoints?: JsonNullableWithAggregatesFilter<"Route">
    distance?: FloatNullableWithAggregatesFilter<"Route"> | number | null
    duration?: IntNullableWithAggregatesFilter<"Route"> | number | null
    polyline?: StringNullableWithAggregatesFilter<"Route"> | string | null
    status?: StringWithAggregatesFilter<"Route"> | string
    startedAt?: DateTimeNullableWithAggregatesFilter<"Route"> | Date | string | null
    completedAt?: DateTimeNullableWithAggregatesFilter<"Route"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Route"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Route"> | Date | string
  }

  export type PlaceWhereInput = {
    AND?: PlaceWhereInput | PlaceWhereInput[]
    OR?: PlaceWhereInput[]
    NOT?: PlaceWhereInput | PlaceWhereInput[]
    id?: StringFilter<"Place"> | string
    name?: StringFilter<"Place"> | string
    placeNameEn?: StringNullableFilter<"Place"> | string | null
    placeNameLocal?: StringNullableFilter<"Place"> | string | null
    category?: StringFilter<"Place"> | string
    latitude?: FloatFilter<"Place"> | number
    longitude?: FloatFilter<"Place"> | number
    zoomLevel?: FloatFilter<"Place"> | number
    userId?: StringFilter<"Place"> | string
    userName?: StringNullableFilter<"Place"> | string | null
    userEmail?: StringNullableFilter<"Place"> | string | null
    source?: StringFilter<"Place"> | string
    approvalStatus?: StringFilter<"Place"> | string
    approvedAt?: DateTimeNullableFilter<"Place"> | Date | string | null
    autoApproveAt?: DateTimeNullableFilter<"Place"> | Date | string | null
    googlePlaceId?: StringNullableFilter<"Place"> | string | null
    googleType?: StringNullableFilter<"Place"> | string | null
    googleTypes?: JsonNullableFilter<"Place">
    googleMapsUrl?: StringNullableFilter<"Place"> | string | null
    vicinity?: StringNullableFilter<"Place"> | string | null
    fullAddress?: StringNullableFilter<"Place"> | string | null
    village?: StringNullableFilter<"Place"> | string | null
    taluk?: StringNullableFilter<"Place"> | string | null
    district?: StringNullableFilter<"Place"> | string | null
    state?: StringNullableFilter<"Place"> | string | null
    country?: StringNullableFilter<"Place"> | string | null
    pincode?: StringNullableFilter<"Place"> | string | null
    phone?: StringNullableFilter<"Place"> | string | null
    website?: StringNullableFilter<"Place"> | string | null
    rating?: FloatNullableFilter<"Place"> | number | null
    reviewCount?: IntNullableFilter<"Place"> | number | null
    openingHours?: JsonNullableFilter<"Place">
    businessStatus?: StringNullableFilter<"Place"> | string | null
    description?: StringNullableFilter<"Place"> | string | null
    googleReviews?: JsonNullableFilter<"Place">
    nearbyPlaces?: JsonNullableFilter<"Place">
    googlePhotos?: JsonNullableFilter<"Place">
    mapRenderingConfig?: JsonNullableFilter<"Place">
    extractedAt?: DateTimeNullableFilter<"Place"> | Date | string | null
    createdAt?: DateTimeFilter<"Place"> | Date | string
    updatedAt?: DateTimeFilter<"Place"> | Date | string
    user?: XOR<UserRelationFilter, UserWhereInput>
    reviews?: PlaceReviewListRelationFilter
    photos?: PlacePhotoListRelationFilter
  }

  export type PlaceOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    placeNameEn?: SortOrderInput | SortOrder
    placeNameLocal?: SortOrderInput | SortOrder
    category?: SortOrder
    latitude?: SortOrder
    longitude?: SortOrder
    zoomLevel?: SortOrder
    userId?: SortOrder
    userName?: SortOrderInput | SortOrder
    userEmail?: SortOrderInput | SortOrder
    source?: SortOrder
    approvalStatus?: SortOrder
    approvedAt?: SortOrderInput | SortOrder
    autoApproveAt?: SortOrderInput | SortOrder
    googlePlaceId?: SortOrderInput | SortOrder
    googleType?: SortOrderInput | SortOrder
    googleTypes?: SortOrderInput | SortOrder
    googleMapsUrl?: SortOrderInput | SortOrder
    vicinity?: SortOrderInput | SortOrder
    fullAddress?: SortOrderInput | SortOrder
    village?: SortOrderInput | SortOrder
    taluk?: SortOrderInput | SortOrder
    district?: SortOrderInput | SortOrder
    state?: SortOrderInput | SortOrder
    country?: SortOrderInput | SortOrder
    pincode?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    website?: SortOrderInput | SortOrder
    rating?: SortOrderInput | SortOrder
    reviewCount?: SortOrderInput | SortOrder
    openingHours?: SortOrderInput | SortOrder
    businessStatus?: SortOrderInput | SortOrder
    description?: SortOrderInput | SortOrder
    googleReviews?: SortOrderInput | SortOrder
    nearbyPlaces?: SortOrderInput | SortOrder
    googlePhotos?: SortOrderInput | SortOrder
    mapRenderingConfig?: SortOrderInput | SortOrder
    extractedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    reviews?: PlaceReviewOrderByRelationAggregateInput
    photos?: PlacePhotoOrderByRelationAggregateInput
  }

  export type PlaceWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    userId_googlePlaceId?: PlaceUserIdGooglePlaceIdCompoundUniqueInput
    AND?: PlaceWhereInput | PlaceWhereInput[]
    OR?: PlaceWhereInput[]
    NOT?: PlaceWhereInput | PlaceWhereInput[]
    name?: StringFilter<"Place"> | string
    placeNameEn?: StringNullableFilter<"Place"> | string | null
    placeNameLocal?: StringNullableFilter<"Place"> | string | null
    category?: StringFilter<"Place"> | string
    latitude?: FloatFilter<"Place"> | number
    longitude?: FloatFilter<"Place"> | number
    zoomLevel?: FloatFilter<"Place"> | number
    userId?: StringFilter<"Place"> | string
    userName?: StringNullableFilter<"Place"> | string | null
    userEmail?: StringNullableFilter<"Place"> | string | null
    source?: StringFilter<"Place"> | string
    approvalStatus?: StringFilter<"Place"> | string
    approvedAt?: DateTimeNullableFilter<"Place"> | Date | string | null
    autoApproveAt?: DateTimeNullableFilter<"Place"> | Date | string | null
    googlePlaceId?: StringNullableFilter<"Place"> | string | null
    googleType?: StringNullableFilter<"Place"> | string | null
    googleTypes?: JsonNullableFilter<"Place">
    googleMapsUrl?: StringNullableFilter<"Place"> | string | null
    vicinity?: StringNullableFilter<"Place"> | string | null
    fullAddress?: StringNullableFilter<"Place"> | string | null
    village?: StringNullableFilter<"Place"> | string | null
    taluk?: StringNullableFilter<"Place"> | string | null
    district?: StringNullableFilter<"Place"> | string | null
    state?: StringNullableFilter<"Place"> | string | null
    country?: StringNullableFilter<"Place"> | string | null
    pincode?: StringNullableFilter<"Place"> | string | null
    phone?: StringNullableFilter<"Place"> | string | null
    website?: StringNullableFilter<"Place"> | string | null
    rating?: FloatNullableFilter<"Place"> | number | null
    reviewCount?: IntNullableFilter<"Place"> | number | null
    openingHours?: JsonNullableFilter<"Place">
    businessStatus?: StringNullableFilter<"Place"> | string | null
    description?: StringNullableFilter<"Place"> | string | null
    googleReviews?: JsonNullableFilter<"Place">
    nearbyPlaces?: JsonNullableFilter<"Place">
    googlePhotos?: JsonNullableFilter<"Place">
    mapRenderingConfig?: JsonNullableFilter<"Place">
    extractedAt?: DateTimeNullableFilter<"Place"> | Date | string | null
    createdAt?: DateTimeFilter<"Place"> | Date | string
    updatedAt?: DateTimeFilter<"Place"> | Date | string
    user?: XOR<UserRelationFilter, UserWhereInput>
    reviews?: PlaceReviewListRelationFilter
    photos?: PlacePhotoListRelationFilter
  }, "id" | "userId_googlePlaceId">

  export type PlaceOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    placeNameEn?: SortOrderInput | SortOrder
    placeNameLocal?: SortOrderInput | SortOrder
    category?: SortOrder
    latitude?: SortOrder
    longitude?: SortOrder
    zoomLevel?: SortOrder
    userId?: SortOrder
    userName?: SortOrderInput | SortOrder
    userEmail?: SortOrderInput | SortOrder
    source?: SortOrder
    approvalStatus?: SortOrder
    approvedAt?: SortOrderInput | SortOrder
    autoApproveAt?: SortOrderInput | SortOrder
    googlePlaceId?: SortOrderInput | SortOrder
    googleType?: SortOrderInput | SortOrder
    googleTypes?: SortOrderInput | SortOrder
    googleMapsUrl?: SortOrderInput | SortOrder
    vicinity?: SortOrderInput | SortOrder
    fullAddress?: SortOrderInput | SortOrder
    village?: SortOrderInput | SortOrder
    taluk?: SortOrderInput | SortOrder
    district?: SortOrderInput | SortOrder
    state?: SortOrderInput | SortOrder
    country?: SortOrderInput | SortOrder
    pincode?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    website?: SortOrderInput | SortOrder
    rating?: SortOrderInput | SortOrder
    reviewCount?: SortOrderInput | SortOrder
    openingHours?: SortOrderInput | SortOrder
    businessStatus?: SortOrderInput | SortOrder
    description?: SortOrderInput | SortOrder
    googleReviews?: SortOrderInput | SortOrder
    nearbyPlaces?: SortOrderInput | SortOrder
    googlePhotos?: SortOrderInput | SortOrder
    mapRenderingConfig?: SortOrderInput | SortOrder
    extractedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: PlaceCountOrderByAggregateInput
    _avg?: PlaceAvgOrderByAggregateInput
    _max?: PlaceMaxOrderByAggregateInput
    _min?: PlaceMinOrderByAggregateInput
    _sum?: PlaceSumOrderByAggregateInput
  }

  export type PlaceScalarWhereWithAggregatesInput = {
    AND?: PlaceScalarWhereWithAggregatesInput | PlaceScalarWhereWithAggregatesInput[]
    OR?: PlaceScalarWhereWithAggregatesInput[]
    NOT?: PlaceScalarWhereWithAggregatesInput | PlaceScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Place"> | string
    name?: StringWithAggregatesFilter<"Place"> | string
    placeNameEn?: StringNullableWithAggregatesFilter<"Place"> | string | null
    placeNameLocal?: StringNullableWithAggregatesFilter<"Place"> | string | null
    category?: StringWithAggregatesFilter<"Place"> | string
    latitude?: FloatWithAggregatesFilter<"Place"> | number
    longitude?: FloatWithAggregatesFilter<"Place"> | number
    zoomLevel?: FloatWithAggregatesFilter<"Place"> | number
    userId?: StringWithAggregatesFilter<"Place"> | string
    userName?: StringNullableWithAggregatesFilter<"Place"> | string | null
    userEmail?: StringNullableWithAggregatesFilter<"Place"> | string | null
    source?: StringWithAggregatesFilter<"Place"> | string
    approvalStatus?: StringWithAggregatesFilter<"Place"> | string
    approvedAt?: DateTimeNullableWithAggregatesFilter<"Place"> | Date | string | null
    autoApproveAt?: DateTimeNullableWithAggregatesFilter<"Place"> | Date | string | null
    googlePlaceId?: StringNullableWithAggregatesFilter<"Place"> | string | null
    googleType?: StringNullableWithAggregatesFilter<"Place"> | string | null
    googleTypes?: JsonNullableWithAggregatesFilter<"Place">
    googleMapsUrl?: StringNullableWithAggregatesFilter<"Place"> | string | null
    vicinity?: StringNullableWithAggregatesFilter<"Place"> | string | null
    fullAddress?: StringNullableWithAggregatesFilter<"Place"> | string | null
    village?: StringNullableWithAggregatesFilter<"Place"> | string | null
    taluk?: StringNullableWithAggregatesFilter<"Place"> | string | null
    district?: StringNullableWithAggregatesFilter<"Place"> | string | null
    state?: StringNullableWithAggregatesFilter<"Place"> | string | null
    country?: StringNullableWithAggregatesFilter<"Place"> | string | null
    pincode?: StringNullableWithAggregatesFilter<"Place"> | string | null
    phone?: StringNullableWithAggregatesFilter<"Place"> | string | null
    website?: StringNullableWithAggregatesFilter<"Place"> | string | null
    rating?: FloatNullableWithAggregatesFilter<"Place"> | number | null
    reviewCount?: IntNullableWithAggregatesFilter<"Place"> | number | null
    openingHours?: JsonNullableWithAggregatesFilter<"Place">
    businessStatus?: StringNullableWithAggregatesFilter<"Place"> | string | null
    description?: StringNullableWithAggregatesFilter<"Place"> | string | null
    googleReviews?: JsonNullableWithAggregatesFilter<"Place">
    nearbyPlaces?: JsonNullableWithAggregatesFilter<"Place">
    googlePhotos?: JsonNullableWithAggregatesFilter<"Place">
    mapRenderingConfig?: JsonNullableWithAggregatesFilter<"Place">
    extractedAt?: DateTimeNullableWithAggregatesFilter<"Place"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Place"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Place"> | Date | string
  }

  export type PlaceReviewWhereInput = {
    AND?: PlaceReviewWhereInput | PlaceReviewWhereInput[]
    OR?: PlaceReviewWhereInput[]
    NOT?: PlaceReviewWhereInput | PlaceReviewWhereInput[]
    id?: StringFilter<"PlaceReview"> | string
    placeId?: StringFilter<"PlaceReview"> | string
    userId?: StringFilter<"PlaceReview"> | string
    userName?: StringNullableFilter<"PlaceReview"> | string | null
    rating?: IntFilter<"PlaceReview"> | number
    comment?: StringNullableFilter<"PlaceReview"> | string | null
    createdAt?: DateTimeFilter<"PlaceReview"> | Date | string
    updatedAt?: DateTimeFilter<"PlaceReview"> | Date | string
    place?: XOR<PlaceRelationFilter, PlaceWhereInput>
    user?: XOR<UserRelationFilter, UserWhereInput>
  }

  export type PlaceReviewOrderByWithRelationInput = {
    id?: SortOrder
    placeId?: SortOrder
    userId?: SortOrder
    userName?: SortOrderInput | SortOrder
    rating?: SortOrder
    comment?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    place?: PlaceOrderByWithRelationInput
    user?: UserOrderByWithRelationInput
  }

  export type PlaceReviewWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    placeId_userId?: PlaceReviewPlaceIdUserIdCompoundUniqueInput
    AND?: PlaceReviewWhereInput | PlaceReviewWhereInput[]
    OR?: PlaceReviewWhereInput[]
    NOT?: PlaceReviewWhereInput | PlaceReviewWhereInput[]
    placeId?: StringFilter<"PlaceReview"> | string
    userId?: StringFilter<"PlaceReview"> | string
    userName?: StringNullableFilter<"PlaceReview"> | string | null
    rating?: IntFilter<"PlaceReview"> | number
    comment?: StringNullableFilter<"PlaceReview"> | string | null
    createdAt?: DateTimeFilter<"PlaceReview"> | Date | string
    updatedAt?: DateTimeFilter<"PlaceReview"> | Date | string
    place?: XOR<PlaceRelationFilter, PlaceWhereInput>
    user?: XOR<UserRelationFilter, UserWhereInput>
  }, "id" | "placeId_userId">

  export type PlaceReviewOrderByWithAggregationInput = {
    id?: SortOrder
    placeId?: SortOrder
    userId?: SortOrder
    userName?: SortOrderInput | SortOrder
    rating?: SortOrder
    comment?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: PlaceReviewCountOrderByAggregateInput
    _avg?: PlaceReviewAvgOrderByAggregateInput
    _max?: PlaceReviewMaxOrderByAggregateInput
    _min?: PlaceReviewMinOrderByAggregateInput
    _sum?: PlaceReviewSumOrderByAggregateInput
  }

  export type PlaceReviewScalarWhereWithAggregatesInput = {
    AND?: PlaceReviewScalarWhereWithAggregatesInput | PlaceReviewScalarWhereWithAggregatesInput[]
    OR?: PlaceReviewScalarWhereWithAggregatesInput[]
    NOT?: PlaceReviewScalarWhereWithAggregatesInput | PlaceReviewScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"PlaceReview"> | string
    placeId?: StringWithAggregatesFilter<"PlaceReview"> | string
    userId?: StringWithAggregatesFilter<"PlaceReview"> | string
    userName?: StringNullableWithAggregatesFilter<"PlaceReview"> | string | null
    rating?: IntWithAggregatesFilter<"PlaceReview"> | number
    comment?: StringNullableWithAggregatesFilter<"PlaceReview"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"PlaceReview"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"PlaceReview"> | Date | string
  }

  export type PlacePhotoWhereInput = {
    AND?: PlacePhotoWhereInput | PlacePhotoWhereInput[]
    OR?: PlacePhotoWhereInput[]
    NOT?: PlacePhotoWhereInput | PlacePhotoWhereInput[]
    id?: StringFilter<"PlacePhoto"> | string
    placeId?: StringFilter<"PlacePhoto"> | string
    userId?: StringFilter<"PlacePhoto"> | string
    userName?: StringNullableFilter<"PlacePhoto"> | string | null
    dataUrl?: StringFilter<"PlacePhoto"> | string
    caption?: StringNullableFilter<"PlacePhoto"> | string | null
    createdAt?: DateTimeFilter<"PlacePhoto"> | Date | string
    place?: XOR<PlaceRelationFilter, PlaceWhereInput>
    user?: XOR<UserRelationFilter, UserWhereInput>
  }

  export type PlacePhotoOrderByWithRelationInput = {
    id?: SortOrder
    placeId?: SortOrder
    userId?: SortOrder
    userName?: SortOrderInput | SortOrder
    dataUrl?: SortOrder
    caption?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    place?: PlaceOrderByWithRelationInput
    user?: UserOrderByWithRelationInput
  }

  export type PlacePhotoWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: PlacePhotoWhereInput | PlacePhotoWhereInput[]
    OR?: PlacePhotoWhereInput[]
    NOT?: PlacePhotoWhereInput | PlacePhotoWhereInput[]
    placeId?: StringFilter<"PlacePhoto"> | string
    userId?: StringFilter<"PlacePhoto"> | string
    userName?: StringNullableFilter<"PlacePhoto"> | string | null
    dataUrl?: StringFilter<"PlacePhoto"> | string
    caption?: StringNullableFilter<"PlacePhoto"> | string | null
    createdAt?: DateTimeFilter<"PlacePhoto"> | Date | string
    place?: XOR<PlaceRelationFilter, PlaceWhereInput>
    user?: XOR<UserRelationFilter, UserWhereInput>
  }, "id">

  export type PlacePhotoOrderByWithAggregationInput = {
    id?: SortOrder
    placeId?: SortOrder
    userId?: SortOrder
    userName?: SortOrderInput | SortOrder
    dataUrl?: SortOrder
    caption?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: PlacePhotoCountOrderByAggregateInput
    _max?: PlacePhotoMaxOrderByAggregateInput
    _min?: PlacePhotoMinOrderByAggregateInput
  }

  export type PlacePhotoScalarWhereWithAggregatesInput = {
    AND?: PlacePhotoScalarWhereWithAggregatesInput | PlacePhotoScalarWhereWithAggregatesInput[]
    OR?: PlacePhotoScalarWhereWithAggregatesInput[]
    NOT?: PlacePhotoScalarWhereWithAggregatesInput | PlacePhotoScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"PlacePhoto"> | string
    placeId?: StringWithAggregatesFilter<"PlacePhoto"> | string
    userId?: StringWithAggregatesFilter<"PlacePhoto"> | string
    userName?: StringNullableWithAggregatesFilter<"PlacePhoto"> | string | null
    dataUrl?: StringWithAggregatesFilter<"PlacePhoto"> | string
    caption?: StringNullableWithAggregatesFilter<"PlacePhoto"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"PlacePhoto"> | Date | string
  }

  export type UserCreateInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    otpVerifications?: OTPVerificationCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
    vehicles?: VehicleCreateNestedManyWithoutUserInput
    locations?: LocationCreateNestedManyWithoutUserInput
    routes?: RouteCreateNestedManyWithoutUserInput
    places?: PlaceCreateNestedManyWithoutUserInput
    placeReviews?: PlaceReviewCreateNestedManyWithoutUserInput
    placePhotos?: PlacePhotoCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    otpVerifications?: OTPVerificationUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    vehicles?: VehicleUncheckedCreateNestedManyWithoutUserInput
    locations?: LocationUncheckedCreateNestedManyWithoutUserInput
    routes?: RouteUncheckedCreateNestedManyWithoutUserInput
    places?: PlaceUncheckedCreateNestedManyWithoutUserInput
    placeReviews?: PlaceReviewUncheckedCreateNestedManyWithoutUserInput
    placePhotos?: PlacePhotoUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpVerifications?: OTPVerificationUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
    vehicles?: VehicleUpdateManyWithoutUserNestedInput
    locations?: LocationUpdateManyWithoutUserNestedInput
    routes?: RouteUpdateManyWithoutUserNestedInput
    places?: PlaceUpdateManyWithoutUserNestedInput
    placeReviews?: PlaceReviewUpdateManyWithoutUserNestedInput
    placePhotos?: PlacePhotoUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpVerifications?: OTPVerificationUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    vehicles?: VehicleUncheckedUpdateManyWithoutUserNestedInput
    locations?: LocationUncheckedUpdateManyWithoutUserNestedInput
    routes?: RouteUncheckedUpdateManyWithoutUserNestedInput
    places?: PlaceUncheckedUpdateManyWithoutUserNestedInput
    placeReviews?: PlaceReviewUncheckedUpdateManyWithoutUserNestedInput
    placePhotos?: PlacePhotoUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OTPVerificationCreateInput = {
    id?: string
    email: string
    otp: string
    type: string
    expiresAt: Date | string
    verified?: boolean
    createdAt?: Date | string
    user?: UserCreateNestedOneWithoutOtpVerificationsInput
  }

  export type OTPVerificationUncheckedCreateInput = {
    id?: string
    email: string
    otp: string
    type: string
    expiresAt: Date | string
    verified?: boolean
    createdAt?: Date | string
    userId?: string | null
  }

  export type OTPVerificationUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    otp?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    verified?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneWithoutOtpVerificationsNestedInput
  }

  export type OTPVerificationUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    otp?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    verified?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type OTPVerificationCreateManyInput = {
    id?: string
    email: string
    otp: string
    type: string
    expiresAt: Date | string
    verified?: boolean
    createdAt?: Date | string
    userId?: string | null
  }

  export type OTPVerificationUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    otp?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    verified?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OTPVerificationUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    otp?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    verified?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type SessionCreateInput = {
    id?: string
    token: string
    expiresAt: Date | string
    createdAt?: Date | string
    user: UserCreateNestedOneWithoutSessionsInput
  }

  export type SessionUncheckedCreateInput = {
    id?: string
    userId: string
    token: string
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type SessionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutSessionsNestedInput
  }

  export type SessionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionCreateManyInput = {
    id?: string
    userId: string
    token: string
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type SessionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VehicleCreateInput = {
    id?: string
    name: string
    licensePlate?: string | null
    type: string
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutVehiclesInput
    locations?: LocationCreateNestedManyWithoutVehicleInput
    routes?: RouteCreateNestedManyWithoutVehicleInput
  }

  export type VehicleUncheckedCreateInput = {
    id?: string
    name: string
    licensePlate?: string | null
    type: string
    status?: string
    userId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    locations?: LocationUncheckedCreateNestedManyWithoutVehicleInput
    routes?: RouteUncheckedCreateNestedManyWithoutVehicleInput
  }

  export type VehicleUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    licensePlate?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutVehiclesNestedInput
    locations?: LocationUpdateManyWithoutVehicleNestedInput
    routes?: RouteUpdateManyWithoutVehicleNestedInput
  }

  export type VehicleUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    licensePlate?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    locations?: LocationUncheckedUpdateManyWithoutVehicleNestedInput
    routes?: RouteUncheckedUpdateManyWithoutVehicleNestedInput
  }

  export type VehicleCreateManyInput = {
    id?: string
    name: string
    licensePlate?: string | null
    type: string
    status?: string
    userId: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type VehicleUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    licensePlate?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VehicleUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    licensePlate?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LocationCreateInput = {
    id?: string
    latitude: number
    longitude: number
    accuracy?: number | null
    speed?: number | null
    heading?: number | null
    timestamp?: Date | string
    vehicle?: VehicleCreateNestedOneWithoutLocationsInput
    user?: UserCreateNestedOneWithoutLocationsInput
  }

  export type LocationUncheckedCreateInput = {
    id?: string
    vehicleId?: string | null
    userId?: string | null
    latitude: number
    longitude: number
    accuracy?: number | null
    speed?: number | null
    heading?: number | null
    timestamp?: Date | string
  }

  export type LocationUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    accuracy?: NullableFloatFieldUpdateOperationsInput | number | null
    speed?: NullableFloatFieldUpdateOperationsInput | number | null
    heading?: NullableFloatFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    vehicle?: VehicleUpdateOneWithoutLocationsNestedInput
    user?: UserUpdateOneWithoutLocationsNestedInput
  }

  export type LocationUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    vehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    accuracy?: NullableFloatFieldUpdateOperationsInput | number | null
    speed?: NullableFloatFieldUpdateOperationsInput | number | null
    heading?: NullableFloatFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LocationCreateManyInput = {
    id?: string
    vehicleId?: string | null
    userId?: string | null
    latitude: number
    longitude: number
    accuracy?: number | null
    speed?: number | null
    heading?: number | null
    timestamp?: Date | string
  }

  export type LocationUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    accuracy?: NullableFloatFieldUpdateOperationsInput | number | null
    speed?: NullableFloatFieldUpdateOperationsInput | number | null
    heading?: NullableFloatFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LocationUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    vehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    accuracy?: NullableFloatFieldUpdateOperationsInput | number | null
    speed?: NullableFloatFieldUpdateOperationsInput | number | null
    heading?: NullableFloatFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RouteCreateInput = {
    id?: string
    name?: string | null
    startLat: number
    startLng: number
    endLat: number
    endLng: number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: number | null
    duration?: number | null
    polyline?: string | null
    status?: string
    startedAt?: Date | string | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    vehicle?: VehicleCreateNestedOneWithoutRoutesInput
    user: UserCreateNestedOneWithoutRoutesInput
  }

  export type RouteUncheckedCreateInput = {
    id?: string
    vehicleId?: string | null
    userId: string
    name?: string | null
    startLat: number
    startLng: number
    endLat: number
    endLng: number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: number | null
    duration?: number | null
    polyline?: string | null
    status?: string
    startedAt?: Date | string | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RouteUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    startLat?: FloatFieldUpdateOperationsInput | number
    startLng?: FloatFieldUpdateOperationsInput | number
    endLat?: FloatFieldUpdateOperationsInput | number
    endLng?: FloatFieldUpdateOperationsInput | number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: NullableFloatFieldUpdateOperationsInput | number | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    polyline?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    vehicle?: VehicleUpdateOneWithoutRoutesNestedInput
    user?: UserUpdateOneRequiredWithoutRoutesNestedInput
  }

  export type RouteUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    vehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    startLat?: FloatFieldUpdateOperationsInput | number
    startLng?: FloatFieldUpdateOperationsInput | number
    endLat?: FloatFieldUpdateOperationsInput | number
    endLng?: FloatFieldUpdateOperationsInput | number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: NullableFloatFieldUpdateOperationsInput | number | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    polyline?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RouteCreateManyInput = {
    id?: string
    vehicleId?: string | null
    userId: string
    name?: string | null
    startLat: number
    startLng: number
    endLat: number
    endLng: number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: number | null
    duration?: number | null
    polyline?: string | null
    status?: string
    startedAt?: Date | string | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RouteUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    startLat?: FloatFieldUpdateOperationsInput | number
    startLng?: FloatFieldUpdateOperationsInput | number
    endLat?: FloatFieldUpdateOperationsInput | number
    endLng?: FloatFieldUpdateOperationsInput | number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: NullableFloatFieldUpdateOperationsInput | number | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    polyline?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RouteUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    vehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    startLat?: FloatFieldUpdateOperationsInput | number
    startLng?: FloatFieldUpdateOperationsInput | number
    endLat?: FloatFieldUpdateOperationsInput | number
    endLng?: FloatFieldUpdateOperationsInput | number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: NullableFloatFieldUpdateOperationsInput | number | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    polyline?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlaceCreateInput = {
    id?: string
    name: string
    placeNameEn?: string | null
    placeNameLocal?: string | null
    category: string
    latitude: number
    longitude: number
    zoomLevel?: number
    userName?: string | null
    userEmail?: string | null
    source?: string
    approvalStatus?: string
    approvedAt?: Date | string | null
    autoApproveAt?: Date | string | null
    googlePlaceId?: string | null
    googleType?: string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: string | null
    vicinity?: string | null
    fullAddress?: string | null
    village?: string | null
    taluk?: string | null
    district?: string | null
    state?: string | null
    country?: string | null
    pincode?: string | null
    phone?: string | null
    website?: string | null
    rating?: number | null
    reviewCount?: number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: string | null
    description?: string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutPlacesInput
    reviews?: PlaceReviewCreateNestedManyWithoutPlaceInput
    photos?: PlacePhotoCreateNestedManyWithoutPlaceInput
  }

  export type PlaceUncheckedCreateInput = {
    id?: string
    name: string
    placeNameEn?: string | null
    placeNameLocal?: string | null
    category: string
    latitude: number
    longitude: number
    zoomLevel?: number
    userId: string
    userName?: string | null
    userEmail?: string | null
    source?: string
    approvalStatus?: string
    approvedAt?: Date | string | null
    autoApproveAt?: Date | string | null
    googlePlaceId?: string | null
    googleType?: string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: string | null
    vicinity?: string | null
    fullAddress?: string | null
    village?: string | null
    taluk?: string | null
    district?: string | null
    state?: string | null
    country?: string | null
    pincode?: string | null
    phone?: string | null
    website?: string | null
    rating?: number | null
    reviewCount?: number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: string | null
    description?: string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reviews?: PlaceReviewUncheckedCreateNestedManyWithoutPlaceInput
    photos?: PlacePhotoUncheckedCreateNestedManyWithoutPlaceInput
  }

  export type PlaceUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    placeNameEn?: NullableStringFieldUpdateOperationsInput | string | null
    placeNameLocal?: NullableStringFieldUpdateOperationsInput | string | null
    category?: StringFieldUpdateOperationsInput | string
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    zoomLevel?: FloatFieldUpdateOperationsInput | number
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    userEmail?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    approvalStatus?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    autoApproveAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    googlePlaceId?: NullableStringFieldUpdateOperationsInput | string | null
    googleType?: NullableStringFieldUpdateOperationsInput | string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vicinity?: NullableStringFieldUpdateOperationsInput | string | null
    fullAddress?: NullableStringFieldUpdateOperationsInput | string | null
    village?: NullableStringFieldUpdateOperationsInput | string | null
    taluk?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    pincode?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    website?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableFloatFieldUpdateOperationsInput | number | null
    reviewCount?: NullableIntFieldUpdateOperationsInput | number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutPlacesNestedInput
    reviews?: PlaceReviewUpdateManyWithoutPlaceNestedInput
    photos?: PlacePhotoUpdateManyWithoutPlaceNestedInput
  }

  export type PlaceUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    placeNameEn?: NullableStringFieldUpdateOperationsInput | string | null
    placeNameLocal?: NullableStringFieldUpdateOperationsInput | string | null
    category?: StringFieldUpdateOperationsInput | string
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    zoomLevel?: FloatFieldUpdateOperationsInput | number
    userId?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    userEmail?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    approvalStatus?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    autoApproveAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    googlePlaceId?: NullableStringFieldUpdateOperationsInput | string | null
    googleType?: NullableStringFieldUpdateOperationsInput | string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vicinity?: NullableStringFieldUpdateOperationsInput | string | null
    fullAddress?: NullableStringFieldUpdateOperationsInput | string | null
    village?: NullableStringFieldUpdateOperationsInput | string | null
    taluk?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    pincode?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    website?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableFloatFieldUpdateOperationsInput | number | null
    reviewCount?: NullableIntFieldUpdateOperationsInput | number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reviews?: PlaceReviewUncheckedUpdateManyWithoutPlaceNestedInput
    photos?: PlacePhotoUncheckedUpdateManyWithoutPlaceNestedInput
  }

  export type PlaceCreateManyInput = {
    id?: string
    name: string
    placeNameEn?: string | null
    placeNameLocal?: string | null
    category: string
    latitude: number
    longitude: number
    zoomLevel?: number
    userId: string
    userName?: string | null
    userEmail?: string | null
    source?: string
    approvalStatus?: string
    approvedAt?: Date | string | null
    autoApproveAt?: Date | string | null
    googlePlaceId?: string | null
    googleType?: string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: string | null
    vicinity?: string | null
    fullAddress?: string | null
    village?: string | null
    taluk?: string | null
    district?: string | null
    state?: string | null
    country?: string | null
    pincode?: string | null
    phone?: string | null
    website?: string | null
    rating?: number | null
    reviewCount?: number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: string | null
    description?: string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PlaceUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    placeNameEn?: NullableStringFieldUpdateOperationsInput | string | null
    placeNameLocal?: NullableStringFieldUpdateOperationsInput | string | null
    category?: StringFieldUpdateOperationsInput | string
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    zoomLevel?: FloatFieldUpdateOperationsInput | number
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    userEmail?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    approvalStatus?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    autoApproveAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    googlePlaceId?: NullableStringFieldUpdateOperationsInput | string | null
    googleType?: NullableStringFieldUpdateOperationsInput | string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vicinity?: NullableStringFieldUpdateOperationsInput | string | null
    fullAddress?: NullableStringFieldUpdateOperationsInput | string | null
    village?: NullableStringFieldUpdateOperationsInput | string | null
    taluk?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    pincode?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    website?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableFloatFieldUpdateOperationsInput | number | null
    reviewCount?: NullableIntFieldUpdateOperationsInput | number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlaceUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    placeNameEn?: NullableStringFieldUpdateOperationsInput | string | null
    placeNameLocal?: NullableStringFieldUpdateOperationsInput | string | null
    category?: StringFieldUpdateOperationsInput | string
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    zoomLevel?: FloatFieldUpdateOperationsInput | number
    userId?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    userEmail?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    approvalStatus?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    autoApproveAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    googlePlaceId?: NullableStringFieldUpdateOperationsInput | string | null
    googleType?: NullableStringFieldUpdateOperationsInput | string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vicinity?: NullableStringFieldUpdateOperationsInput | string | null
    fullAddress?: NullableStringFieldUpdateOperationsInput | string | null
    village?: NullableStringFieldUpdateOperationsInput | string | null
    taluk?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    pincode?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    website?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableFloatFieldUpdateOperationsInput | number | null
    reviewCount?: NullableIntFieldUpdateOperationsInput | number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlaceReviewCreateInput = {
    id?: string
    userName?: string | null
    rating: number
    comment?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    place: PlaceCreateNestedOneWithoutReviewsInput
    user: UserCreateNestedOneWithoutPlaceReviewsInput
  }

  export type PlaceReviewUncheckedCreateInput = {
    id?: string
    placeId: string
    userId: string
    userName?: string | null
    rating: number
    comment?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PlaceReviewUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: IntFieldUpdateOperationsInput | number
    comment?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    place?: PlaceUpdateOneRequiredWithoutReviewsNestedInput
    user?: UserUpdateOneRequiredWithoutPlaceReviewsNestedInput
  }

  export type PlaceReviewUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    placeId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: IntFieldUpdateOperationsInput | number
    comment?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlaceReviewCreateManyInput = {
    id?: string
    placeId: string
    userId: string
    userName?: string | null
    rating: number
    comment?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PlaceReviewUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: IntFieldUpdateOperationsInput | number
    comment?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlaceReviewUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    placeId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: IntFieldUpdateOperationsInput | number
    comment?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlacePhotoCreateInput = {
    id?: string
    userName?: string | null
    dataUrl: string
    caption?: string | null
    createdAt?: Date | string
    place: PlaceCreateNestedOneWithoutPhotosInput
    user: UserCreateNestedOneWithoutPlacePhotosInput
  }

  export type PlacePhotoUncheckedCreateInput = {
    id?: string
    placeId: string
    userId: string
    userName?: string | null
    dataUrl: string
    caption?: string | null
    createdAt?: Date | string
  }

  export type PlacePhotoUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    dataUrl?: StringFieldUpdateOperationsInput | string
    caption?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    place?: PlaceUpdateOneRequiredWithoutPhotosNestedInput
    user?: UserUpdateOneRequiredWithoutPlacePhotosNestedInput
  }

  export type PlacePhotoUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    placeId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    dataUrl?: StringFieldUpdateOperationsInput | string
    caption?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlacePhotoCreateManyInput = {
    id?: string
    placeId: string
    userId: string
    userName?: string | null
    dataUrl: string
    caption?: string | null
    createdAt?: Date | string
  }

  export type PlacePhotoUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    dataUrl?: StringFieldUpdateOperationsInput | string
    caption?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlacePhotoUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    placeId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    dataUrl?: StringFieldUpdateOperationsInput | string
    caption?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type OTPVerificationListRelationFilter = {
    every?: OTPVerificationWhereInput
    some?: OTPVerificationWhereInput
    none?: OTPVerificationWhereInput
  }

  export type SessionListRelationFilter = {
    every?: SessionWhereInput
    some?: SessionWhereInput
    none?: SessionWhereInput
  }

  export type VehicleListRelationFilter = {
    every?: VehicleWhereInput
    some?: VehicleWhereInput
    none?: VehicleWhereInput
  }

  export type LocationListRelationFilter = {
    every?: LocationWhereInput
    some?: LocationWhereInput
    none?: LocationWhereInput
  }

  export type RouteListRelationFilter = {
    every?: RouteWhereInput
    some?: RouteWhereInput
    none?: RouteWhereInput
  }

  export type PlaceListRelationFilter = {
    every?: PlaceWhereInput
    some?: PlaceWhereInput
    none?: PlaceWhereInput
  }

  export type PlaceReviewListRelationFilter = {
    every?: PlaceReviewWhereInput
    some?: PlaceReviewWhereInput
    none?: PlaceReviewWhereInput
  }

  export type PlacePhotoListRelationFilter = {
    every?: PlacePhotoWhereInput
    some?: PlacePhotoWhereInput
    none?: PlacePhotoWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type OTPVerificationOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type SessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type VehicleOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type LocationOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type RouteOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type PlaceOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type PlaceReviewOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type PlacePhotoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    googleId?: SortOrder
    picture?: SortOrder
    emailVerified?: SortOrder
    lastGridExtractAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    googleId?: SortOrder
    picture?: SortOrder
    emailVerified?: SortOrder
    lastGridExtractAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    googleId?: SortOrder
    picture?: SortOrder
    emailVerified?: SortOrder
    lastGridExtractAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type UserNullableRelationFilter = {
    is?: UserWhereInput | null
    isNot?: UserWhereInput | null
  }

  export type OTPVerificationCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    otp?: SortOrder
    type?: SortOrder
    expiresAt?: SortOrder
    verified?: SortOrder
    createdAt?: SortOrder
    userId?: SortOrder
  }

  export type OTPVerificationMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    otp?: SortOrder
    type?: SortOrder
    expiresAt?: SortOrder
    verified?: SortOrder
    createdAt?: SortOrder
    userId?: SortOrder
  }

  export type OTPVerificationMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    otp?: SortOrder
    type?: SortOrder
    expiresAt?: SortOrder
    verified?: SortOrder
    createdAt?: SortOrder
    userId?: SortOrder
  }

  export type UserRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type SessionCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    token?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
  }

  export type SessionMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    token?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
  }

  export type SessionMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    token?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
  }

  export type VehicleCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    licensePlate?: SortOrder
    type?: SortOrder
    status?: SortOrder
    userId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type VehicleMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    licensePlate?: SortOrder
    type?: SortOrder
    status?: SortOrder
    userId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type VehicleMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    licensePlate?: SortOrder
    type?: SortOrder
    status?: SortOrder
    userId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type VehicleNullableRelationFilter = {
    is?: VehicleWhereInput | null
    isNot?: VehicleWhereInput | null
  }

  export type LocationCountOrderByAggregateInput = {
    id?: SortOrder
    vehicleId?: SortOrder
    userId?: SortOrder
    latitude?: SortOrder
    longitude?: SortOrder
    accuracy?: SortOrder
    speed?: SortOrder
    heading?: SortOrder
    timestamp?: SortOrder
  }

  export type LocationAvgOrderByAggregateInput = {
    latitude?: SortOrder
    longitude?: SortOrder
    accuracy?: SortOrder
    speed?: SortOrder
    heading?: SortOrder
  }

  export type LocationMaxOrderByAggregateInput = {
    id?: SortOrder
    vehicleId?: SortOrder
    userId?: SortOrder
    latitude?: SortOrder
    longitude?: SortOrder
    accuracy?: SortOrder
    speed?: SortOrder
    heading?: SortOrder
    timestamp?: SortOrder
  }

  export type LocationMinOrderByAggregateInput = {
    id?: SortOrder
    vehicleId?: SortOrder
    userId?: SortOrder
    latitude?: SortOrder
    longitude?: SortOrder
    accuracy?: SortOrder
    speed?: SortOrder
    heading?: SortOrder
    timestamp?: SortOrder
  }

  export type LocationSumOrderByAggregateInput = {
    latitude?: SortOrder
    longitude?: SortOrder
    accuracy?: SortOrder
    speed?: SortOrder
    heading?: SortOrder
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }
  export type JsonNullableFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type RouteCountOrderByAggregateInput = {
    id?: SortOrder
    vehicleId?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    startLat?: SortOrder
    startLng?: SortOrder
    endLat?: SortOrder
    endLng?: SortOrder
    waypoints?: SortOrder
    distance?: SortOrder
    duration?: SortOrder
    polyline?: SortOrder
    status?: SortOrder
    startedAt?: SortOrder
    completedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RouteAvgOrderByAggregateInput = {
    startLat?: SortOrder
    startLng?: SortOrder
    endLat?: SortOrder
    endLng?: SortOrder
    distance?: SortOrder
    duration?: SortOrder
  }

  export type RouteMaxOrderByAggregateInput = {
    id?: SortOrder
    vehicleId?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    startLat?: SortOrder
    startLng?: SortOrder
    endLat?: SortOrder
    endLng?: SortOrder
    distance?: SortOrder
    duration?: SortOrder
    polyline?: SortOrder
    status?: SortOrder
    startedAt?: SortOrder
    completedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RouteMinOrderByAggregateInput = {
    id?: SortOrder
    vehicleId?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    startLat?: SortOrder
    startLng?: SortOrder
    endLat?: SortOrder
    endLng?: SortOrder
    distance?: SortOrder
    duration?: SortOrder
    polyline?: SortOrder
    status?: SortOrder
    startedAt?: SortOrder
    completedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RouteSumOrderByAggregateInput = {
    startLat?: SortOrder
    startLng?: SortOrder
    endLat?: SortOrder
    endLng?: SortOrder
    distance?: SortOrder
    duration?: SortOrder
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type PlaceUserIdGooglePlaceIdCompoundUniqueInput = {
    userId: string
    googlePlaceId: string
  }

  export type PlaceCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    placeNameEn?: SortOrder
    placeNameLocal?: SortOrder
    category?: SortOrder
    latitude?: SortOrder
    longitude?: SortOrder
    zoomLevel?: SortOrder
    userId?: SortOrder
    userName?: SortOrder
    userEmail?: SortOrder
    source?: SortOrder
    approvalStatus?: SortOrder
    approvedAt?: SortOrder
    autoApproveAt?: SortOrder
    googlePlaceId?: SortOrder
    googleType?: SortOrder
    googleTypes?: SortOrder
    googleMapsUrl?: SortOrder
    vicinity?: SortOrder
    fullAddress?: SortOrder
    village?: SortOrder
    taluk?: SortOrder
    district?: SortOrder
    state?: SortOrder
    country?: SortOrder
    pincode?: SortOrder
    phone?: SortOrder
    website?: SortOrder
    rating?: SortOrder
    reviewCount?: SortOrder
    openingHours?: SortOrder
    businessStatus?: SortOrder
    description?: SortOrder
    googleReviews?: SortOrder
    nearbyPlaces?: SortOrder
    googlePhotos?: SortOrder
    mapRenderingConfig?: SortOrder
    extractedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PlaceAvgOrderByAggregateInput = {
    latitude?: SortOrder
    longitude?: SortOrder
    zoomLevel?: SortOrder
    rating?: SortOrder
    reviewCount?: SortOrder
  }

  export type PlaceMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    placeNameEn?: SortOrder
    placeNameLocal?: SortOrder
    category?: SortOrder
    latitude?: SortOrder
    longitude?: SortOrder
    zoomLevel?: SortOrder
    userId?: SortOrder
    userName?: SortOrder
    userEmail?: SortOrder
    source?: SortOrder
    approvalStatus?: SortOrder
    approvedAt?: SortOrder
    autoApproveAt?: SortOrder
    googlePlaceId?: SortOrder
    googleType?: SortOrder
    googleMapsUrl?: SortOrder
    vicinity?: SortOrder
    fullAddress?: SortOrder
    village?: SortOrder
    taluk?: SortOrder
    district?: SortOrder
    state?: SortOrder
    country?: SortOrder
    pincode?: SortOrder
    phone?: SortOrder
    website?: SortOrder
    rating?: SortOrder
    reviewCount?: SortOrder
    businessStatus?: SortOrder
    description?: SortOrder
    extractedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PlaceMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    placeNameEn?: SortOrder
    placeNameLocal?: SortOrder
    category?: SortOrder
    latitude?: SortOrder
    longitude?: SortOrder
    zoomLevel?: SortOrder
    userId?: SortOrder
    userName?: SortOrder
    userEmail?: SortOrder
    source?: SortOrder
    approvalStatus?: SortOrder
    approvedAt?: SortOrder
    autoApproveAt?: SortOrder
    googlePlaceId?: SortOrder
    googleType?: SortOrder
    googleMapsUrl?: SortOrder
    vicinity?: SortOrder
    fullAddress?: SortOrder
    village?: SortOrder
    taluk?: SortOrder
    district?: SortOrder
    state?: SortOrder
    country?: SortOrder
    pincode?: SortOrder
    phone?: SortOrder
    website?: SortOrder
    rating?: SortOrder
    reviewCount?: SortOrder
    businessStatus?: SortOrder
    description?: SortOrder
    extractedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PlaceSumOrderByAggregateInput = {
    latitude?: SortOrder
    longitude?: SortOrder
    zoomLevel?: SortOrder
    rating?: SortOrder
    reviewCount?: SortOrder
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type PlaceRelationFilter = {
    is?: PlaceWhereInput
    isNot?: PlaceWhereInput
  }

  export type PlaceReviewPlaceIdUserIdCompoundUniqueInput = {
    placeId: string
    userId: string
  }

  export type PlaceReviewCountOrderByAggregateInput = {
    id?: SortOrder
    placeId?: SortOrder
    userId?: SortOrder
    userName?: SortOrder
    rating?: SortOrder
    comment?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PlaceReviewAvgOrderByAggregateInput = {
    rating?: SortOrder
  }

  export type PlaceReviewMaxOrderByAggregateInput = {
    id?: SortOrder
    placeId?: SortOrder
    userId?: SortOrder
    userName?: SortOrder
    rating?: SortOrder
    comment?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PlaceReviewMinOrderByAggregateInput = {
    id?: SortOrder
    placeId?: SortOrder
    userId?: SortOrder
    userName?: SortOrder
    rating?: SortOrder
    comment?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PlaceReviewSumOrderByAggregateInput = {
    rating?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type PlacePhotoCountOrderByAggregateInput = {
    id?: SortOrder
    placeId?: SortOrder
    userId?: SortOrder
    userName?: SortOrder
    dataUrl?: SortOrder
    caption?: SortOrder
    createdAt?: SortOrder
  }

  export type PlacePhotoMaxOrderByAggregateInput = {
    id?: SortOrder
    placeId?: SortOrder
    userId?: SortOrder
    userName?: SortOrder
    dataUrl?: SortOrder
    caption?: SortOrder
    createdAt?: SortOrder
  }

  export type PlacePhotoMinOrderByAggregateInput = {
    id?: SortOrder
    placeId?: SortOrder
    userId?: SortOrder
    userName?: SortOrder
    dataUrl?: SortOrder
    caption?: SortOrder
    createdAt?: SortOrder
  }

  export type OTPVerificationCreateNestedManyWithoutUserInput = {
    create?: XOR<OTPVerificationCreateWithoutUserInput, OTPVerificationUncheckedCreateWithoutUserInput> | OTPVerificationCreateWithoutUserInput[] | OTPVerificationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: OTPVerificationCreateOrConnectWithoutUserInput | OTPVerificationCreateOrConnectWithoutUserInput[]
    createMany?: OTPVerificationCreateManyUserInputEnvelope
    connect?: OTPVerificationWhereUniqueInput | OTPVerificationWhereUniqueInput[]
  }

  export type SessionCreateNestedManyWithoutUserInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
  }

  export type VehicleCreateNestedManyWithoutUserInput = {
    create?: XOR<VehicleCreateWithoutUserInput, VehicleUncheckedCreateWithoutUserInput> | VehicleCreateWithoutUserInput[] | VehicleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: VehicleCreateOrConnectWithoutUserInput | VehicleCreateOrConnectWithoutUserInput[]
    createMany?: VehicleCreateManyUserInputEnvelope
    connect?: VehicleWhereUniqueInput | VehicleWhereUniqueInput[]
  }

  export type LocationCreateNestedManyWithoutUserInput = {
    create?: XOR<LocationCreateWithoutUserInput, LocationUncheckedCreateWithoutUserInput> | LocationCreateWithoutUserInput[] | LocationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: LocationCreateOrConnectWithoutUserInput | LocationCreateOrConnectWithoutUserInput[]
    createMany?: LocationCreateManyUserInputEnvelope
    connect?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
  }

  export type RouteCreateNestedManyWithoutUserInput = {
    create?: XOR<RouteCreateWithoutUserInput, RouteUncheckedCreateWithoutUserInput> | RouteCreateWithoutUserInput[] | RouteUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RouteCreateOrConnectWithoutUserInput | RouteCreateOrConnectWithoutUserInput[]
    createMany?: RouteCreateManyUserInputEnvelope
    connect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
  }

  export type PlaceCreateNestedManyWithoutUserInput = {
    create?: XOR<PlaceCreateWithoutUserInput, PlaceUncheckedCreateWithoutUserInput> | PlaceCreateWithoutUserInput[] | PlaceUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PlaceCreateOrConnectWithoutUserInput | PlaceCreateOrConnectWithoutUserInput[]
    createMany?: PlaceCreateManyUserInputEnvelope
    connect?: PlaceWhereUniqueInput | PlaceWhereUniqueInput[]
  }

  export type PlaceReviewCreateNestedManyWithoutUserInput = {
    create?: XOR<PlaceReviewCreateWithoutUserInput, PlaceReviewUncheckedCreateWithoutUserInput> | PlaceReviewCreateWithoutUserInput[] | PlaceReviewUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PlaceReviewCreateOrConnectWithoutUserInput | PlaceReviewCreateOrConnectWithoutUserInput[]
    createMany?: PlaceReviewCreateManyUserInputEnvelope
    connect?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
  }

  export type PlacePhotoCreateNestedManyWithoutUserInput = {
    create?: XOR<PlacePhotoCreateWithoutUserInput, PlacePhotoUncheckedCreateWithoutUserInput> | PlacePhotoCreateWithoutUserInput[] | PlacePhotoUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PlacePhotoCreateOrConnectWithoutUserInput | PlacePhotoCreateOrConnectWithoutUserInput[]
    createMany?: PlacePhotoCreateManyUserInputEnvelope
    connect?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
  }

  export type OTPVerificationUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<OTPVerificationCreateWithoutUserInput, OTPVerificationUncheckedCreateWithoutUserInput> | OTPVerificationCreateWithoutUserInput[] | OTPVerificationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: OTPVerificationCreateOrConnectWithoutUserInput | OTPVerificationCreateOrConnectWithoutUserInput[]
    createMany?: OTPVerificationCreateManyUserInputEnvelope
    connect?: OTPVerificationWhereUniqueInput | OTPVerificationWhereUniqueInput[]
  }

  export type SessionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
  }

  export type VehicleUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<VehicleCreateWithoutUserInput, VehicleUncheckedCreateWithoutUserInput> | VehicleCreateWithoutUserInput[] | VehicleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: VehicleCreateOrConnectWithoutUserInput | VehicleCreateOrConnectWithoutUserInput[]
    createMany?: VehicleCreateManyUserInputEnvelope
    connect?: VehicleWhereUniqueInput | VehicleWhereUniqueInput[]
  }

  export type LocationUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<LocationCreateWithoutUserInput, LocationUncheckedCreateWithoutUserInput> | LocationCreateWithoutUserInput[] | LocationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: LocationCreateOrConnectWithoutUserInput | LocationCreateOrConnectWithoutUserInput[]
    createMany?: LocationCreateManyUserInputEnvelope
    connect?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
  }

  export type RouteUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<RouteCreateWithoutUserInput, RouteUncheckedCreateWithoutUserInput> | RouteCreateWithoutUserInput[] | RouteUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RouteCreateOrConnectWithoutUserInput | RouteCreateOrConnectWithoutUserInput[]
    createMany?: RouteCreateManyUserInputEnvelope
    connect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
  }

  export type PlaceUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<PlaceCreateWithoutUserInput, PlaceUncheckedCreateWithoutUserInput> | PlaceCreateWithoutUserInput[] | PlaceUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PlaceCreateOrConnectWithoutUserInput | PlaceCreateOrConnectWithoutUserInput[]
    createMany?: PlaceCreateManyUserInputEnvelope
    connect?: PlaceWhereUniqueInput | PlaceWhereUniqueInput[]
  }

  export type PlaceReviewUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<PlaceReviewCreateWithoutUserInput, PlaceReviewUncheckedCreateWithoutUserInput> | PlaceReviewCreateWithoutUserInput[] | PlaceReviewUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PlaceReviewCreateOrConnectWithoutUserInput | PlaceReviewCreateOrConnectWithoutUserInput[]
    createMany?: PlaceReviewCreateManyUserInputEnvelope
    connect?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
  }

  export type PlacePhotoUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<PlacePhotoCreateWithoutUserInput, PlacePhotoUncheckedCreateWithoutUserInput> | PlacePhotoCreateWithoutUserInput[] | PlacePhotoUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PlacePhotoCreateOrConnectWithoutUserInput | PlacePhotoCreateOrConnectWithoutUserInput[]
    createMany?: PlacePhotoCreateManyUserInputEnvelope
    connect?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type OTPVerificationUpdateManyWithoutUserNestedInput = {
    create?: XOR<OTPVerificationCreateWithoutUserInput, OTPVerificationUncheckedCreateWithoutUserInput> | OTPVerificationCreateWithoutUserInput[] | OTPVerificationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: OTPVerificationCreateOrConnectWithoutUserInput | OTPVerificationCreateOrConnectWithoutUserInput[]
    upsert?: OTPVerificationUpsertWithWhereUniqueWithoutUserInput | OTPVerificationUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: OTPVerificationCreateManyUserInputEnvelope
    set?: OTPVerificationWhereUniqueInput | OTPVerificationWhereUniqueInput[]
    disconnect?: OTPVerificationWhereUniqueInput | OTPVerificationWhereUniqueInput[]
    delete?: OTPVerificationWhereUniqueInput | OTPVerificationWhereUniqueInput[]
    connect?: OTPVerificationWhereUniqueInput | OTPVerificationWhereUniqueInput[]
    update?: OTPVerificationUpdateWithWhereUniqueWithoutUserInput | OTPVerificationUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: OTPVerificationUpdateManyWithWhereWithoutUserInput | OTPVerificationUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: OTPVerificationScalarWhereInput | OTPVerificationScalarWhereInput[]
  }

  export type SessionUpdateManyWithoutUserNestedInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    upsert?: SessionUpsertWithWhereUniqueWithoutUserInput | SessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    set?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    disconnect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    delete?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    update?: SessionUpdateWithWhereUniqueWithoutUserInput | SessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: SessionUpdateManyWithWhereWithoutUserInput | SessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: SessionScalarWhereInput | SessionScalarWhereInput[]
  }

  export type VehicleUpdateManyWithoutUserNestedInput = {
    create?: XOR<VehicleCreateWithoutUserInput, VehicleUncheckedCreateWithoutUserInput> | VehicleCreateWithoutUserInput[] | VehicleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: VehicleCreateOrConnectWithoutUserInput | VehicleCreateOrConnectWithoutUserInput[]
    upsert?: VehicleUpsertWithWhereUniqueWithoutUserInput | VehicleUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: VehicleCreateManyUserInputEnvelope
    set?: VehicleWhereUniqueInput | VehicleWhereUniqueInput[]
    disconnect?: VehicleWhereUniqueInput | VehicleWhereUniqueInput[]
    delete?: VehicleWhereUniqueInput | VehicleWhereUniqueInput[]
    connect?: VehicleWhereUniqueInput | VehicleWhereUniqueInput[]
    update?: VehicleUpdateWithWhereUniqueWithoutUserInput | VehicleUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: VehicleUpdateManyWithWhereWithoutUserInput | VehicleUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: VehicleScalarWhereInput | VehicleScalarWhereInput[]
  }

  export type LocationUpdateManyWithoutUserNestedInput = {
    create?: XOR<LocationCreateWithoutUserInput, LocationUncheckedCreateWithoutUserInput> | LocationCreateWithoutUserInput[] | LocationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: LocationCreateOrConnectWithoutUserInput | LocationCreateOrConnectWithoutUserInput[]
    upsert?: LocationUpsertWithWhereUniqueWithoutUserInput | LocationUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: LocationCreateManyUserInputEnvelope
    set?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
    disconnect?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
    delete?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
    connect?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
    update?: LocationUpdateWithWhereUniqueWithoutUserInput | LocationUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: LocationUpdateManyWithWhereWithoutUserInput | LocationUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: LocationScalarWhereInput | LocationScalarWhereInput[]
  }

  export type RouteUpdateManyWithoutUserNestedInput = {
    create?: XOR<RouteCreateWithoutUserInput, RouteUncheckedCreateWithoutUserInput> | RouteCreateWithoutUserInput[] | RouteUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RouteCreateOrConnectWithoutUserInput | RouteCreateOrConnectWithoutUserInput[]
    upsert?: RouteUpsertWithWhereUniqueWithoutUserInput | RouteUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: RouteCreateManyUserInputEnvelope
    set?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    disconnect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    delete?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    connect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    update?: RouteUpdateWithWhereUniqueWithoutUserInput | RouteUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: RouteUpdateManyWithWhereWithoutUserInput | RouteUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: RouteScalarWhereInput | RouteScalarWhereInput[]
  }

  export type PlaceUpdateManyWithoutUserNestedInput = {
    create?: XOR<PlaceCreateWithoutUserInput, PlaceUncheckedCreateWithoutUserInput> | PlaceCreateWithoutUserInput[] | PlaceUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PlaceCreateOrConnectWithoutUserInput | PlaceCreateOrConnectWithoutUserInput[]
    upsert?: PlaceUpsertWithWhereUniqueWithoutUserInput | PlaceUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: PlaceCreateManyUserInputEnvelope
    set?: PlaceWhereUniqueInput | PlaceWhereUniqueInput[]
    disconnect?: PlaceWhereUniqueInput | PlaceWhereUniqueInput[]
    delete?: PlaceWhereUniqueInput | PlaceWhereUniqueInput[]
    connect?: PlaceWhereUniqueInput | PlaceWhereUniqueInput[]
    update?: PlaceUpdateWithWhereUniqueWithoutUserInput | PlaceUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: PlaceUpdateManyWithWhereWithoutUserInput | PlaceUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: PlaceScalarWhereInput | PlaceScalarWhereInput[]
  }

  export type PlaceReviewUpdateManyWithoutUserNestedInput = {
    create?: XOR<PlaceReviewCreateWithoutUserInput, PlaceReviewUncheckedCreateWithoutUserInput> | PlaceReviewCreateWithoutUserInput[] | PlaceReviewUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PlaceReviewCreateOrConnectWithoutUserInput | PlaceReviewCreateOrConnectWithoutUserInput[]
    upsert?: PlaceReviewUpsertWithWhereUniqueWithoutUserInput | PlaceReviewUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: PlaceReviewCreateManyUserInputEnvelope
    set?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
    disconnect?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
    delete?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
    connect?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
    update?: PlaceReviewUpdateWithWhereUniqueWithoutUserInput | PlaceReviewUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: PlaceReviewUpdateManyWithWhereWithoutUserInput | PlaceReviewUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: PlaceReviewScalarWhereInput | PlaceReviewScalarWhereInput[]
  }

  export type PlacePhotoUpdateManyWithoutUserNestedInput = {
    create?: XOR<PlacePhotoCreateWithoutUserInput, PlacePhotoUncheckedCreateWithoutUserInput> | PlacePhotoCreateWithoutUserInput[] | PlacePhotoUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PlacePhotoCreateOrConnectWithoutUserInput | PlacePhotoCreateOrConnectWithoutUserInput[]
    upsert?: PlacePhotoUpsertWithWhereUniqueWithoutUserInput | PlacePhotoUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: PlacePhotoCreateManyUserInputEnvelope
    set?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
    disconnect?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
    delete?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
    connect?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
    update?: PlacePhotoUpdateWithWhereUniqueWithoutUserInput | PlacePhotoUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: PlacePhotoUpdateManyWithWhereWithoutUserInput | PlacePhotoUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: PlacePhotoScalarWhereInput | PlacePhotoScalarWhereInput[]
  }

  export type OTPVerificationUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<OTPVerificationCreateWithoutUserInput, OTPVerificationUncheckedCreateWithoutUserInput> | OTPVerificationCreateWithoutUserInput[] | OTPVerificationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: OTPVerificationCreateOrConnectWithoutUserInput | OTPVerificationCreateOrConnectWithoutUserInput[]
    upsert?: OTPVerificationUpsertWithWhereUniqueWithoutUserInput | OTPVerificationUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: OTPVerificationCreateManyUserInputEnvelope
    set?: OTPVerificationWhereUniqueInput | OTPVerificationWhereUniqueInput[]
    disconnect?: OTPVerificationWhereUniqueInput | OTPVerificationWhereUniqueInput[]
    delete?: OTPVerificationWhereUniqueInput | OTPVerificationWhereUniqueInput[]
    connect?: OTPVerificationWhereUniqueInput | OTPVerificationWhereUniqueInput[]
    update?: OTPVerificationUpdateWithWhereUniqueWithoutUserInput | OTPVerificationUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: OTPVerificationUpdateManyWithWhereWithoutUserInput | OTPVerificationUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: OTPVerificationScalarWhereInput | OTPVerificationScalarWhereInput[]
  }

  export type SessionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    upsert?: SessionUpsertWithWhereUniqueWithoutUserInput | SessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    set?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    disconnect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    delete?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    update?: SessionUpdateWithWhereUniqueWithoutUserInput | SessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: SessionUpdateManyWithWhereWithoutUserInput | SessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: SessionScalarWhereInput | SessionScalarWhereInput[]
  }

  export type VehicleUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<VehicleCreateWithoutUserInput, VehicleUncheckedCreateWithoutUserInput> | VehicleCreateWithoutUserInput[] | VehicleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: VehicleCreateOrConnectWithoutUserInput | VehicleCreateOrConnectWithoutUserInput[]
    upsert?: VehicleUpsertWithWhereUniqueWithoutUserInput | VehicleUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: VehicleCreateManyUserInputEnvelope
    set?: VehicleWhereUniqueInput | VehicleWhereUniqueInput[]
    disconnect?: VehicleWhereUniqueInput | VehicleWhereUniqueInput[]
    delete?: VehicleWhereUniqueInput | VehicleWhereUniqueInput[]
    connect?: VehicleWhereUniqueInput | VehicleWhereUniqueInput[]
    update?: VehicleUpdateWithWhereUniqueWithoutUserInput | VehicleUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: VehicleUpdateManyWithWhereWithoutUserInput | VehicleUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: VehicleScalarWhereInput | VehicleScalarWhereInput[]
  }

  export type LocationUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<LocationCreateWithoutUserInput, LocationUncheckedCreateWithoutUserInput> | LocationCreateWithoutUserInput[] | LocationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: LocationCreateOrConnectWithoutUserInput | LocationCreateOrConnectWithoutUserInput[]
    upsert?: LocationUpsertWithWhereUniqueWithoutUserInput | LocationUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: LocationCreateManyUserInputEnvelope
    set?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
    disconnect?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
    delete?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
    connect?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
    update?: LocationUpdateWithWhereUniqueWithoutUserInput | LocationUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: LocationUpdateManyWithWhereWithoutUserInput | LocationUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: LocationScalarWhereInput | LocationScalarWhereInput[]
  }

  export type RouteUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<RouteCreateWithoutUserInput, RouteUncheckedCreateWithoutUserInput> | RouteCreateWithoutUserInput[] | RouteUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RouteCreateOrConnectWithoutUserInput | RouteCreateOrConnectWithoutUserInput[]
    upsert?: RouteUpsertWithWhereUniqueWithoutUserInput | RouteUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: RouteCreateManyUserInputEnvelope
    set?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    disconnect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    delete?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    connect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    update?: RouteUpdateWithWhereUniqueWithoutUserInput | RouteUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: RouteUpdateManyWithWhereWithoutUserInput | RouteUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: RouteScalarWhereInput | RouteScalarWhereInput[]
  }

  export type PlaceUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<PlaceCreateWithoutUserInput, PlaceUncheckedCreateWithoutUserInput> | PlaceCreateWithoutUserInput[] | PlaceUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PlaceCreateOrConnectWithoutUserInput | PlaceCreateOrConnectWithoutUserInput[]
    upsert?: PlaceUpsertWithWhereUniqueWithoutUserInput | PlaceUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: PlaceCreateManyUserInputEnvelope
    set?: PlaceWhereUniqueInput | PlaceWhereUniqueInput[]
    disconnect?: PlaceWhereUniqueInput | PlaceWhereUniqueInput[]
    delete?: PlaceWhereUniqueInput | PlaceWhereUniqueInput[]
    connect?: PlaceWhereUniqueInput | PlaceWhereUniqueInput[]
    update?: PlaceUpdateWithWhereUniqueWithoutUserInput | PlaceUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: PlaceUpdateManyWithWhereWithoutUserInput | PlaceUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: PlaceScalarWhereInput | PlaceScalarWhereInput[]
  }

  export type PlaceReviewUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<PlaceReviewCreateWithoutUserInput, PlaceReviewUncheckedCreateWithoutUserInput> | PlaceReviewCreateWithoutUserInput[] | PlaceReviewUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PlaceReviewCreateOrConnectWithoutUserInput | PlaceReviewCreateOrConnectWithoutUserInput[]
    upsert?: PlaceReviewUpsertWithWhereUniqueWithoutUserInput | PlaceReviewUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: PlaceReviewCreateManyUserInputEnvelope
    set?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
    disconnect?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
    delete?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
    connect?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
    update?: PlaceReviewUpdateWithWhereUniqueWithoutUserInput | PlaceReviewUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: PlaceReviewUpdateManyWithWhereWithoutUserInput | PlaceReviewUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: PlaceReviewScalarWhereInput | PlaceReviewScalarWhereInput[]
  }

  export type PlacePhotoUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<PlacePhotoCreateWithoutUserInput, PlacePhotoUncheckedCreateWithoutUserInput> | PlacePhotoCreateWithoutUserInput[] | PlacePhotoUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PlacePhotoCreateOrConnectWithoutUserInput | PlacePhotoCreateOrConnectWithoutUserInput[]
    upsert?: PlacePhotoUpsertWithWhereUniqueWithoutUserInput | PlacePhotoUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: PlacePhotoCreateManyUserInputEnvelope
    set?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
    disconnect?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
    delete?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
    connect?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
    update?: PlacePhotoUpdateWithWhereUniqueWithoutUserInput | PlacePhotoUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: PlacePhotoUpdateManyWithWhereWithoutUserInput | PlacePhotoUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: PlacePhotoScalarWhereInput | PlacePhotoScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutOtpVerificationsInput = {
    create?: XOR<UserCreateWithoutOtpVerificationsInput, UserUncheckedCreateWithoutOtpVerificationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutOtpVerificationsInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneWithoutOtpVerificationsNestedInput = {
    create?: XOR<UserCreateWithoutOtpVerificationsInput, UserUncheckedCreateWithoutOtpVerificationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutOtpVerificationsInput
    upsert?: UserUpsertWithoutOtpVerificationsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutOtpVerificationsInput, UserUpdateWithoutOtpVerificationsInput>, UserUncheckedUpdateWithoutOtpVerificationsInput>
  }

  export type UserCreateNestedOneWithoutSessionsInput = {
    create?: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSessionsInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutSessionsNestedInput = {
    create?: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSessionsInput
    upsert?: UserUpsertWithoutSessionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSessionsInput, UserUpdateWithoutSessionsInput>, UserUncheckedUpdateWithoutSessionsInput>
  }

  export type UserCreateNestedOneWithoutVehiclesInput = {
    create?: XOR<UserCreateWithoutVehiclesInput, UserUncheckedCreateWithoutVehiclesInput>
    connectOrCreate?: UserCreateOrConnectWithoutVehiclesInput
    connect?: UserWhereUniqueInput
  }

  export type LocationCreateNestedManyWithoutVehicleInput = {
    create?: XOR<LocationCreateWithoutVehicleInput, LocationUncheckedCreateWithoutVehicleInput> | LocationCreateWithoutVehicleInput[] | LocationUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: LocationCreateOrConnectWithoutVehicleInput | LocationCreateOrConnectWithoutVehicleInput[]
    createMany?: LocationCreateManyVehicleInputEnvelope
    connect?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
  }

  export type RouteCreateNestedManyWithoutVehicleInput = {
    create?: XOR<RouteCreateWithoutVehicleInput, RouteUncheckedCreateWithoutVehicleInput> | RouteCreateWithoutVehicleInput[] | RouteUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: RouteCreateOrConnectWithoutVehicleInput | RouteCreateOrConnectWithoutVehicleInput[]
    createMany?: RouteCreateManyVehicleInputEnvelope
    connect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
  }

  export type LocationUncheckedCreateNestedManyWithoutVehicleInput = {
    create?: XOR<LocationCreateWithoutVehicleInput, LocationUncheckedCreateWithoutVehicleInput> | LocationCreateWithoutVehicleInput[] | LocationUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: LocationCreateOrConnectWithoutVehicleInput | LocationCreateOrConnectWithoutVehicleInput[]
    createMany?: LocationCreateManyVehicleInputEnvelope
    connect?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
  }

  export type RouteUncheckedCreateNestedManyWithoutVehicleInput = {
    create?: XOR<RouteCreateWithoutVehicleInput, RouteUncheckedCreateWithoutVehicleInput> | RouteCreateWithoutVehicleInput[] | RouteUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: RouteCreateOrConnectWithoutVehicleInput | RouteCreateOrConnectWithoutVehicleInput[]
    createMany?: RouteCreateManyVehicleInputEnvelope
    connect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
  }

  export type UserUpdateOneRequiredWithoutVehiclesNestedInput = {
    create?: XOR<UserCreateWithoutVehiclesInput, UserUncheckedCreateWithoutVehiclesInput>
    connectOrCreate?: UserCreateOrConnectWithoutVehiclesInput
    upsert?: UserUpsertWithoutVehiclesInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutVehiclesInput, UserUpdateWithoutVehiclesInput>, UserUncheckedUpdateWithoutVehiclesInput>
  }

  export type LocationUpdateManyWithoutVehicleNestedInput = {
    create?: XOR<LocationCreateWithoutVehicleInput, LocationUncheckedCreateWithoutVehicleInput> | LocationCreateWithoutVehicleInput[] | LocationUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: LocationCreateOrConnectWithoutVehicleInput | LocationCreateOrConnectWithoutVehicleInput[]
    upsert?: LocationUpsertWithWhereUniqueWithoutVehicleInput | LocationUpsertWithWhereUniqueWithoutVehicleInput[]
    createMany?: LocationCreateManyVehicleInputEnvelope
    set?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
    disconnect?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
    delete?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
    connect?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
    update?: LocationUpdateWithWhereUniqueWithoutVehicleInput | LocationUpdateWithWhereUniqueWithoutVehicleInput[]
    updateMany?: LocationUpdateManyWithWhereWithoutVehicleInput | LocationUpdateManyWithWhereWithoutVehicleInput[]
    deleteMany?: LocationScalarWhereInput | LocationScalarWhereInput[]
  }

  export type RouteUpdateManyWithoutVehicleNestedInput = {
    create?: XOR<RouteCreateWithoutVehicleInput, RouteUncheckedCreateWithoutVehicleInput> | RouteCreateWithoutVehicleInput[] | RouteUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: RouteCreateOrConnectWithoutVehicleInput | RouteCreateOrConnectWithoutVehicleInput[]
    upsert?: RouteUpsertWithWhereUniqueWithoutVehicleInput | RouteUpsertWithWhereUniqueWithoutVehicleInput[]
    createMany?: RouteCreateManyVehicleInputEnvelope
    set?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    disconnect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    delete?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    connect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    update?: RouteUpdateWithWhereUniqueWithoutVehicleInput | RouteUpdateWithWhereUniqueWithoutVehicleInput[]
    updateMany?: RouteUpdateManyWithWhereWithoutVehicleInput | RouteUpdateManyWithWhereWithoutVehicleInput[]
    deleteMany?: RouteScalarWhereInput | RouteScalarWhereInput[]
  }

  export type LocationUncheckedUpdateManyWithoutVehicleNestedInput = {
    create?: XOR<LocationCreateWithoutVehicleInput, LocationUncheckedCreateWithoutVehicleInput> | LocationCreateWithoutVehicleInput[] | LocationUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: LocationCreateOrConnectWithoutVehicleInput | LocationCreateOrConnectWithoutVehicleInput[]
    upsert?: LocationUpsertWithWhereUniqueWithoutVehicleInput | LocationUpsertWithWhereUniqueWithoutVehicleInput[]
    createMany?: LocationCreateManyVehicleInputEnvelope
    set?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
    disconnect?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
    delete?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
    connect?: LocationWhereUniqueInput | LocationWhereUniqueInput[]
    update?: LocationUpdateWithWhereUniqueWithoutVehicleInput | LocationUpdateWithWhereUniqueWithoutVehicleInput[]
    updateMany?: LocationUpdateManyWithWhereWithoutVehicleInput | LocationUpdateManyWithWhereWithoutVehicleInput[]
    deleteMany?: LocationScalarWhereInput | LocationScalarWhereInput[]
  }

  export type RouteUncheckedUpdateManyWithoutVehicleNestedInput = {
    create?: XOR<RouteCreateWithoutVehicleInput, RouteUncheckedCreateWithoutVehicleInput> | RouteCreateWithoutVehicleInput[] | RouteUncheckedCreateWithoutVehicleInput[]
    connectOrCreate?: RouteCreateOrConnectWithoutVehicleInput | RouteCreateOrConnectWithoutVehicleInput[]
    upsert?: RouteUpsertWithWhereUniqueWithoutVehicleInput | RouteUpsertWithWhereUniqueWithoutVehicleInput[]
    createMany?: RouteCreateManyVehicleInputEnvelope
    set?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    disconnect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    delete?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    connect?: RouteWhereUniqueInput | RouteWhereUniqueInput[]
    update?: RouteUpdateWithWhereUniqueWithoutVehicleInput | RouteUpdateWithWhereUniqueWithoutVehicleInput[]
    updateMany?: RouteUpdateManyWithWhereWithoutVehicleInput | RouteUpdateManyWithWhereWithoutVehicleInput[]
    deleteMany?: RouteScalarWhereInput | RouteScalarWhereInput[]
  }

  export type VehicleCreateNestedOneWithoutLocationsInput = {
    create?: XOR<VehicleCreateWithoutLocationsInput, VehicleUncheckedCreateWithoutLocationsInput>
    connectOrCreate?: VehicleCreateOrConnectWithoutLocationsInput
    connect?: VehicleWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutLocationsInput = {
    create?: XOR<UserCreateWithoutLocationsInput, UserUncheckedCreateWithoutLocationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutLocationsInput
    connect?: UserWhereUniqueInput
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type VehicleUpdateOneWithoutLocationsNestedInput = {
    create?: XOR<VehicleCreateWithoutLocationsInput, VehicleUncheckedCreateWithoutLocationsInput>
    connectOrCreate?: VehicleCreateOrConnectWithoutLocationsInput
    upsert?: VehicleUpsertWithoutLocationsInput
    disconnect?: VehicleWhereInput | boolean
    delete?: VehicleWhereInput | boolean
    connect?: VehicleWhereUniqueInput
    update?: XOR<XOR<VehicleUpdateToOneWithWhereWithoutLocationsInput, VehicleUpdateWithoutLocationsInput>, VehicleUncheckedUpdateWithoutLocationsInput>
  }

  export type UserUpdateOneWithoutLocationsNestedInput = {
    create?: XOR<UserCreateWithoutLocationsInput, UserUncheckedCreateWithoutLocationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutLocationsInput
    upsert?: UserUpsertWithoutLocationsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutLocationsInput, UserUpdateWithoutLocationsInput>, UserUncheckedUpdateWithoutLocationsInput>
  }

  export type VehicleCreateNestedOneWithoutRoutesInput = {
    create?: XOR<VehicleCreateWithoutRoutesInput, VehicleUncheckedCreateWithoutRoutesInput>
    connectOrCreate?: VehicleCreateOrConnectWithoutRoutesInput
    connect?: VehicleWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutRoutesInput = {
    create?: XOR<UserCreateWithoutRoutesInput, UserUncheckedCreateWithoutRoutesInput>
    connectOrCreate?: UserCreateOrConnectWithoutRoutesInput
    connect?: UserWhereUniqueInput
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type VehicleUpdateOneWithoutRoutesNestedInput = {
    create?: XOR<VehicleCreateWithoutRoutesInput, VehicleUncheckedCreateWithoutRoutesInput>
    connectOrCreate?: VehicleCreateOrConnectWithoutRoutesInput
    upsert?: VehicleUpsertWithoutRoutesInput
    disconnect?: VehicleWhereInput | boolean
    delete?: VehicleWhereInput | boolean
    connect?: VehicleWhereUniqueInput
    update?: XOR<XOR<VehicleUpdateToOneWithWhereWithoutRoutesInput, VehicleUpdateWithoutRoutesInput>, VehicleUncheckedUpdateWithoutRoutesInput>
  }

  export type UserUpdateOneRequiredWithoutRoutesNestedInput = {
    create?: XOR<UserCreateWithoutRoutesInput, UserUncheckedCreateWithoutRoutesInput>
    connectOrCreate?: UserCreateOrConnectWithoutRoutesInput
    upsert?: UserUpsertWithoutRoutesInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutRoutesInput, UserUpdateWithoutRoutesInput>, UserUncheckedUpdateWithoutRoutesInput>
  }

  export type UserCreateNestedOneWithoutPlacesInput = {
    create?: XOR<UserCreateWithoutPlacesInput, UserUncheckedCreateWithoutPlacesInput>
    connectOrCreate?: UserCreateOrConnectWithoutPlacesInput
    connect?: UserWhereUniqueInput
  }

  export type PlaceReviewCreateNestedManyWithoutPlaceInput = {
    create?: XOR<PlaceReviewCreateWithoutPlaceInput, PlaceReviewUncheckedCreateWithoutPlaceInput> | PlaceReviewCreateWithoutPlaceInput[] | PlaceReviewUncheckedCreateWithoutPlaceInput[]
    connectOrCreate?: PlaceReviewCreateOrConnectWithoutPlaceInput | PlaceReviewCreateOrConnectWithoutPlaceInput[]
    createMany?: PlaceReviewCreateManyPlaceInputEnvelope
    connect?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
  }

  export type PlacePhotoCreateNestedManyWithoutPlaceInput = {
    create?: XOR<PlacePhotoCreateWithoutPlaceInput, PlacePhotoUncheckedCreateWithoutPlaceInput> | PlacePhotoCreateWithoutPlaceInput[] | PlacePhotoUncheckedCreateWithoutPlaceInput[]
    connectOrCreate?: PlacePhotoCreateOrConnectWithoutPlaceInput | PlacePhotoCreateOrConnectWithoutPlaceInput[]
    createMany?: PlacePhotoCreateManyPlaceInputEnvelope
    connect?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
  }

  export type PlaceReviewUncheckedCreateNestedManyWithoutPlaceInput = {
    create?: XOR<PlaceReviewCreateWithoutPlaceInput, PlaceReviewUncheckedCreateWithoutPlaceInput> | PlaceReviewCreateWithoutPlaceInput[] | PlaceReviewUncheckedCreateWithoutPlaceInput[]
    connectOrCreate?: PlaceReviewCreateOrConnectWithoutPlaceInput | PlaceReviewCreateOrConnectWithoutPlaceInput[]
    createMany?: PlaceReviewCreateManyPlaceInputEnvelope
    connect?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
  }

  export type PlacePhotoUncheckedCreateNestedManyWithoutPlaceInput = {
    create?: XOR<PlacePhotoCreateWithoutPlaceInput, PlacePhotoUncheckedCreateWithoutPlaceInput> | PlacePhotoCreateWithoutPlaceInput[] | PlacePhotoUncheckedCreateWithoutPlaceInput[]
    connectOrCreate?: PlacePhotoCreateOrConnectWithoutPlaceInput | PlacePhotoCreateOrConnectWithoutPlaceInput[]
    createMany?: PlacePhotoCreateManyPlaceInputEnvelope
    connect?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
  }

  export type UserUpdateOneRequiredWithoutPlacesNestedInput = {
    create?: XOR<UserCreateWithoutPlacesInput, UserUncheckedCreateWithoutPlacesInput>
    connectOrCreate?: UserCreateOrConnectWithoutPlacesInput
    upsert?: UserUpsertWithoutPlacesInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutPlacesInput, UserUpdateWithoutPlacesInput>, UserUncheckedUpdateWithoutPlacesInput>
  }

  export type PlaceReviewUpdateManyWithoutPlaceNestedInput = {
    create?: XOR<PlaceReviewCreateWithoutPlaceInput, PlaceReviewUncheckedCreateWithoutPlaceInput> | PlaceReviewCreateWithoutPlaceInput[] | PlaceReviewUncheckedCreateWithoutPlaceInput[]
    connectOrCreate?: PlaceReviewCreateOrConnectWithoutPlaceInput | PlaceReviewCreateOrConnectWithoutPlaceInput[]
    upsert?: PlaceReviewUpsertWithWhereUniqueWithoutPlaceInput | PlaceReviewUpsertWithWhereUniqueWithoutPlaceInput[]
    createMany?: PlaceReviewCreateManyPlaceInputEnvelope
    set?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
    disconnect?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
    delete?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
    connect?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
    update?: PlaceReviewUpdateWithWhereUniqueWithoutPlaceInput | PlaceReviewUpdateWithWhereUniqueWithoutPlaceInput[]
    updateMany?: PlaceReviewUpdateManyWithWhereWithoutPlaceInput | PlaceReviewUpdateManyWithWhereWithoutPlaceInput[]
    deleteMany?: PlaceReviewScalarWhereInput | PlaceReviewScalarWhereInput[]
  }

  export type PlacePhotoUpdateManyWithoutPlaceNestedInput = {
    create?: XOR<PlacePhotoCreateWithoutPlaceInput, PlacePhotoUncheckedCreateWithoutPlaceInput> | PlacePhotoCreateWithoutPlaceInput[] | PlacePhotoUncheckedCreateWithoutPlaceInput[]
    connectOrCreate?: PlacePhotoCreateOrConnectWithoutPlaceInput | PlacePhotoCreateOrConnectWithoutPlaceInput[]
    upsert?: PlacePhotoUpsertWithWhereUniqueWithoutPlaceInput | PlacePhotoUpsertWithWhereUniqueWithoutPlaceInput[]
    createMany?: PlacePhotoCreateManyPlaceInputEnvelope
    set?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
    disconnect?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
    delete?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
    connect?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
    update?: PlacePhotoUpdateWithWhereUniqueWithoutPlaceInput | PlacePhotoUpdateWithWhereUniqueWithoutPlaceInput[]
    updateMany?: PlacePhotoUpdateManyWithWhereWithoutPlaceInput | PlacePhotoUpdateManyWithWhereWithoutPlaceInput[]
    deleteMany?: PlacePhotoScalarWhereInput | PlacePhotoScalarWhereInput[]
  }

  export type PlaceReviewUncheckedUpdateManyWithoutPlaceNestedInput = {
    create?: XOR<PlaceReviewCreateWithoutPlaceInput, PlaceReviewUncheckedCreateWithoutPlaceInput> | PlaceReviewCreateWithoutPlaceInput[] | PlaceReviewUncheckedCreateWithoutPlaceInput[]
    connectOrCreate?: PlaceReviewCreateOrConnectWithoutPlaceInput | PlaceReviewCreateOrConnectWithoutPlaceInput[]
    upsert?: PlaceReviewUpsertWithWhereUniqueWithoutPlaceInput | PlaceReviewUpsertWithWhereUniqueWithoutPlaceInput[]
    createMany?: PlaceReviewCreateManyPlaceInputEnvelope
    set?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
    disconnect?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
    delete?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
    connect?: PlaceReviewWhereUniqueInput | PlaceReviewWhereUniqueInput[]
    update?: PlaceReviewUpdateWithWhereUniqueWithoutPlaceInput | PlaceReviewUpdateWithWhereUniqueWithoutPlaceInput[]
    updateMany?: PlaceReviewUpdateManyWithWhereWithoutPlaceInput | PlaceReviewUpdateManyWithWhereWithoutPlaceInput[]
    deleteMany?: PlaceReviewScalarWhereInput | PlaceReviewScalarWhereInput[]
  }

  export type PlacePhotoUncheckedUpdateManyWithoutPlaceNestedInput = {
    create?: XOR<PlacePhotoCreateWithoutPlaceInput, PlacePhotoUncheckedCreateWithoutPlaceInput> | PlacePhotoCreateWithoutPlaceInput[] | PlacePhotoUncheckedCreateWithoutPlaceInput[]
    connectOrCreate?: PlacePhotoCreateOrConnectWithoutPlaceInput | PlacePhotoCreateOrConnectWithoutPlaceInput[]
    upsert?: PlacePhotoUpsertWithWhereUniqueWithoutPlaceInput | PlacePhotoUpsertWithWhereUniqueWithoutPlaceInput[]
    createMany?: PlacePhotoCreateManyPlaceInputEnvelope
    set?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
    disconnect?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
    delete?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
    connect?: PlacePhotoWhereUniqueInput | PlacePhotoWhereUniqueInput[]
    update?: PlacePhotoUpdateWithWhereUniqueWithoutPlaceInput | PlacePhotoUpdateWithWhereUniqueWithoutPlaceInput[]
    updateMany?: PlacePhotoUpdateManyWithWhereWithoutPlaceInput | PlacePhotoUpdateManyWithWhereWithoutPlaceInput[]
    deleteMany?: PlacePhotoScalarWhereInput | PlacePhotoScalarWhereInput[]
  }

  export type PlaceCreateNestedOneWithoutReviewsInput = {
    create?: XOR<PlaceCreateWithoutReviewsInput, PlaceUncheckedCreateWithoutReviewsInput>
    connectOrCreate?: PlaceCreateOrConnectWithoutReviewsInput
    connect?: PlaceWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutPlaceReviewsInput = {
    create?: XOR<UserCreateWithoutPlaceReviewsInput, UserUncheckedCreateWithoutPlaceReviewsInput>
    connectOrCreate?: UserCreateOrConnectWithoutPlaceReviewsInput
    connect?: UserWhereUniqueInput
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type PlaceUpdateOneRequiredWithoutReviewsNestedInput = {
    create?: XOR<PlaceCreateWithoutReviewsInput, PlaceUncheckedCreateWithoutReviewsInput>
    connectOrCreate?: PlaceCreateOrConnectWithoutReviewsInput
    upsert?: PlaceUpsertWithoutReviewsInput
    connect?: PlaceWhereUniqueInput
    update?: XOR<XOR<PlaceUpdateToOneWithWhereWithoutReviewsInput, PlaceUpdateWithoutReviewsInput>, PlaceUncheckedUpdateWithoutReviewsInput>
  }

  export type UserUpdateOneRequiredWithoutPlaceReviewsNestedInput = {
    create?: XOR<UserCreateWithoutPlaceReviewsInput, UserUncheckedCreateWithoutPlaceReviewsInput>
    connectOrCreate?: UserCreateOrConnectWithoutPlaceReviewsInput
    upsert?: UserUpsertWithoutPlaceReviewsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutPlaceReviewsInput, UserUpdateWithoutPlaceReviewsInput>, UserUncheckedUpdateWithoutPlaceReviewsInput>
  }

  export type PlaceCreateNestedOneWithoutPhotosInput = {
    create?: XOR<PlaceCreateWithoutPhotosInput, PlaceUncheckedCreateWithoutPhotosInput>
    connectOrCreate?: PlaceCreateOrConnectWithoutPhotosInput
    connect?: PlaceWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutPlacePhotosInput = {
    create?: XOR<UserCreateWithoutPlacePhotosInput, UserUncheckedCreateWithoutPlacePhotosInput>
    connectOrCreate?: UserCreateOrConnectWithoutPlacePhotosInput
    connect?: UserWhereUniqueInput
  }

  export type PlaceUpdateOneRequiredWithoutPhotosNestedInput = {
    create?: XOR<PlaceCreateWithoutPhotosInput, PlaceUncheckedCreateWithoutPhotosInput>
    connectOrCreate?: PlaceCreateOrConnectWithoutPhotosInput
    upsert?: PlaceUpsertWithoutPhotosInput
    connect?: PlaceWhereUniqueInput
    update?: XOR<XOR<PlaceUpdateToOneWithWhereWithoutPhotosInput, PlaceUpdateWithoutPhotosInput>, PlaceUncheckedUpdateWithoutPhotosInput>
  }

  export type UserUpdateOneRequiredWithoutPlacePhotosNestedInput = {
    create?: XOR<UserCreateWithoutPlacePhotosInput, UserUncheckedCreateWithoutPlacePhotosInput>
    connectOrCreate?: UserCreateOrConnectWithoutPlacePhotosInput
    upsert?: UserUpsertWithoutPlacePhotosInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutPlacePhotosInput, UserUpdateWithoutPlacePhotosInput>, UserUncheckedUpdateWithoutPlacePhotosInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type OTPVerificationCreateWithoutUserInput = {
    id?: string
    email: string
    otp: string
    type: string
    expiresAt: Date | string
    verified?: boolean
    createdAt?: Date | string
  }

  export type OTPVerificationUncheckedCreateWithoutUserInput = {
    id?: string
    email: string
    otp: string
    type: string
    expiresAt: Date | string
    verified?: boolean
    createdAt?: Date | string
  }

  export type OTPVerificationCreateOrConnectWithoutUserInput = {
    where: OTPVerificationWhereUniqueInput
    create: XOR<OTPVerificationCreateWithoutUserInput, OTPVerificationUncheckedCreateWithoutUserInput>
  }

  export type OTPVerificationCreateManyUserInputEnvelope = {
    data: OTPVerificationCreateManyUserInput | OTPVerificationCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type SessionCreateWithoutUserInput = {
    id?: string
    token: string
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type SessionUncheckedCreateWithoutUserInput = {
    id?: string
    token: string
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type SessionCreateOrConnectWithoutUserInput = {
    where: SessionWhereUniqueInput
    create: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput>
  }

  export type SessionCreateManyUserInputEnvelope = {
    data: SessionCreateManyUserInput | SessionCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type VehicleCreateWithoutUserInput = {
    id?: string
    name: string
    licensePlate?: string | null
    type: string
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    locations?: LocationCreateNestedManyWithoutVehicleInput
    routes?: RouteCreateNestedManyWithoutVehicleInput
  }

  export type VehicleUncheckedCreateWithoutUserInput = {
    id?: string
    name: string
    licensePlate?: string | null
    type: string
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    locations?: LocationUncheckedCreateNestedManyWithoutVehicleInput
    routes?: RouteUncheckedCreateNestedManyWithoutVehicleInput
  }

  export type VehicleCreateOrConnectWithoutUserInput = {
    where: VehicleWhereUniqueInput
    create: XOR<VehicleCreateWithoutUserInput, VehicleUncheckedCreateWithoutUserInput>
  }

  export type VehicleCreateManyUserInputEnvelope = {
    data: VehicleCreateManyUserInput | VehicleCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type LocationCreateWithoutUserInput = {
    id?: string
    latitude: number
    longitude: number
    accuracy?: number | null
    speed?: number | null
    heading?: number | null
    timestamp?: Date | string
    vehicle?: VehicleCreateNestedOneWithoutLocationsInput
  }

  export type LocationUncheckedCreateWithoutUserInput = {
    id?: string
    vehicleId?: string | null
    latitude: number
    longitude: number
    accuracy?: number | null
    speed?: number | null
    heading?: number | null
    timestamp?: Date | string
  }

  export type LocationCreateOrConnectWithoutUserInput = {
    where: LocationWhereUniqueInput
    create: XOR<LocationCreateWithoutUserInput, LocationUncheckedCreateWithoutUserInput>
  }

  export type LocationCreateManyUserInputEnvelope = {
    data: LocationCreateManyUserInput | LocationCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type RouteCreateWithoutUserInput = {
    id?: string
    name?: string | null
    startLat: number
    startLng: number
    endLat: number
    endLng: number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: number | null
    duration?: number | null
    polyline?: string | null
    status?: string
    startedAt?: Date | string | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    vehicle?: VehicleCreateNestedOneWithoutRoutesInput
  }

  export type RouteUncheckedCreateWithoutUserInput = {
    id?: string
    vehicleId?: string | null
    name?: string | null
    startLat: number
    startLng: number
    endLat: number
    endLng: number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: number | null
    duration?: number | null
    polyline?: string | null
    status?: string
    startedAt?: Date | string | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RouteCreateOrConnectWithoutUserInput = {
    where: RouteWhereUniqueInput
    create: XOR<RouteCreateWithoutUserInput, RouteUncheckedCreateWithoutUserInput>
  }

  export type RouteCreateManyUserInputEnvelope = {
    data: RouteCreateManyUserInput | RouteCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type PlaceCreateWithoutUserInput = {
    id?: string
    name: string
    placeNameEn?: string | null
    placeNameLocal?: string | null
    category: string
    latitude: number
    longitude: number
    zoomLevel?: number
    userName?: string | null
    userEmail?: string | null
    source?: string
    approvalStatus?: string
    approvedAt?: Date | string | null
    autoApproveAt?: Date | string | null
    googlePlaceId?: string | null
    googleType?: string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: string | null
    vicinity?: string | null
    fullAddress?: string | null
    village?: string | null
    taluk?: string | null
    district?: string | null
    state?: string | null
    country?: string | null
    pincode?: string | null
    phone?: string | null
    website?: string | null
    rating?: number | null
    reviewCount?: number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: string | null
    description?: string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reviews?: PlaceReviewCreateNestedManyWithoutPlaceInput
    photos?: PlacePhotoCreateNestedManyWithoutPlaceInput
  }

  export type PlaceUncheckedCreateWithoutUserInput = {
    id?: string
    name: string
    placeNameEn?: string | null
    placeNameLocal?: string | null
    category: string
    latitude: number
    longitude: number
    zoomLevel?: number
    userName?: string | null
    userEmail?: string | null
    source?: string
    approvalStatus?: string
    approvedAt?: Date | string | null
    autoApproveAt?: Date | string | null
    googlePlaceId?: string | null
    googleType?: string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: string | null
    vicinity?: string | null
    fullAddress?: string | null
    village?: string | null
    taluk?: string | null
    district?: string | null
    state?: string | null
    country?: string | null
    pincode?: string | null
    phone?: string | null
    website?: string | null
    rating?: number | null
    reviewCount?: number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: string | null
    description?: string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reviews?: PlaceReviewUncheckedCreateNestedManyWithoutPlaceInput
    photos?: PlacePhotoUncheckedCreateNestedManyWithoutPlaceInput
  }

  export type PlaceCreateOrConnectWithoutUserInput = {
    where: PlaceWhereUniqueInput
    create: XOR<PlaceCreateWithoutUserInput, PlaceUncheckedCreateWithoutUserInput>
  }

  export type PlaceCreateManyUserInputEnvelope = {
    data: PlaceCreateManyUserInput | PlaceCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type PlaceReviewCreateWithoutUserInput = {
    id?: string
    userName?: string | null
    rating: number
    comment?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    place: PlaceCreateNestedOneWithoutReviewsInput
  }

  export type PlaceReviewUncheckedCreateWithoutUserInput = {
    id?: string
    placeId: string
    userName?: string | null
    rating: number
    comment?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PlaceReviewCreateOrConnectWithoutUserInput = {
    where: PlaceReviewWhereUniqueInput
    create: XOR<PlaceReviewCreateWithoutUserInput, PlaceReviewUncheckedCreateWithoutUserInput>
  }

  export type PlaceReviewCreateManyUserInputEnvelope = {
    data: PlaceReviewCreateManyUserInput | PlaceReviewCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type PlacePhotoCreateWithoutUserInput = {
    id?: string
    userName?: string | null
    dataUrl: string
    caption?: string | null
    createdAt?: Date | string
    place: PlaceCreateNestedOneWithoutPhotosInput
  }

  export type PlacePhotoUncheckedCreateWithoutUserInput = {
    id?: string
    placeId: string
    userName?: string | null
    dataUrl: string
    caption?: string | null
    createdAt?: Date | string
  }

  export type PlacePhotoCreateOrConnectWithoutUserInput = {
    where: PlacePhotoWhereUniqueInput
    create: XOR<PlacePhotoCreateWithoutUserInput, PlacePhotoUncheckedCreateWithoutUserInput>
  }

  export type PlacePhotoCreateManyUserInputEnvelope = {
    data: PlacePhotoCreateManyUserInput | PlacePhotoCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type OTPVerificationUpsertWithWhereUniqueWithoutUserInput = {
    where: OTPVerificationWhereUniqueInput
    update: XOR<OTPVerificationUpdateWithoutUserInput, OTPVerificationUncheckedUpdateWithoutUserInput>
    create: XOR<OTPVerificationCreateWithoutUserInput, OTPVerificationUncheckedCreateWithoutUserInput>
  }

  export type OTPVerificationUpdateWithWhereUniqueWithoutUserInput = {
    where: OTPVerificationWhereUniqueInput
    data: XOR<OTPVerificationUpdateWithoutUserInput, OTPVerificationUncheckedUpdateWithoutUserInput>
  }

  export type OTPVerificationUpdateManyWithWhereWithoutUserInput = {
    where: OTPVerificationScalarWhereInput
    data: XOR<OTPVerificationUpdateManyMutationInput, OTPVerificationUncheckedUpdateManyWithoutUserInput>
  }

  export type OTPVerificationScalarWhereInput = {
    AND?: OTPVerificationScalarWhereInput | OTPVerificationScalarWhereInput[]
    OR?: OTPVerificationScalarWhereInput[]
    NOT?: OTPVerificationScalarWhereInput | OTPVerificationScalarWhereInput[]
    id?: StringFilter<"OTPVerification"> | string
    email?: StringFilter<"OTPVerification"> | string
    otp?: StringFilter<"OTPVerification"> | string
    type?: StringFilter<"OTPVerification"> | string
    expiresAt?: DateTimeFilter<"OTPVerification"> | Date | string
    verified?: BoolFilter<"OTPVerification"> | boolean
    createdAt?: DateTimeFilter<"OTPVerification"> | Date | string
    userId?: StringNullableFilter<"OTPVerification"> | string | null
  }

  export type SessionUpsertWithWhereUniqueWithoutUserInput = {
    where: SessionWhereUniqueInput
    update: XOR<SessionUpdateWithoutUserInput, SessionUncheckedUpdateWithoutUserInput>
    create: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput>
  }

  export type SessionUpdateWithWhereUniqueWithoutUserInput = {
    where: SessionWhereUniqueInput
    data: XOR<SessionUpdateWithoutUserInput, SessionUncheckedUpdateWithoutUserInput>
  }

  export type SessionUpdateManyWithWhereWithoutUserInput = {
    where: SessionScalarWhereInput
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyWithoutUserInput>
  }

  export type SessionScalarWhereInput = {
    AND?: SessionScalarWhereInput | SessionScalarWhereInput[]
    OR?: SessionScalarWhereInput[]
    NOT?: SessionScalarWhereInput | SessionScalarWhereInput[]
    id?: StringFilter<"Session"> | string
    userId?: StringFilter<"Session"> | string
    token?: StringFilter<"Session"> | string
    expiresAt?: DateTimeFilter<"Session"> | Date | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
  }

  export type VehicleUpsertWithWhereUniqueWithoutUserInput = {
    where: VehicleWhereUniqueInput
    update: XOR<VehicleUpdateWithoutUserInput, VehicleUncheckedUpdateWithoutUserInput>
    create: XOR<VehicleCreateWithoutUserInput, VehicleUncheckedCreateWithoutUserInput>
  }

  export type VehicleUpdateWithWhereUniqueWithoutUserInput = {
    where: VehicleWhereUniqueInput
    data: XOR<VehicleUpdateWithoutUserInput, VehicleUncheckedUpdateWithoutUserInput>
  }

  export type VehicleUpdateManyWithWhereWithoutUserInput = {
    where: VehicleScalarWhereInput
    data: XOR<VehicleUpdateManyMutationInput, VehicleUncheckedUpdateManyWithoutUserInput>
  }

  export type VehicleScalarWhereInput = {
    AND?: VehicleScalarWhereInput | VehicleScalarWhereInput[]
    OR?: VehicleScalarWhereInput[]
    NOT?: VehicleScalarWhereInput | VehicleScalarWhereInput[]
    id?: StringFilter<"Vehicle"> | string
    name?: StringFilter<"Vehicle"> | string
    licensePlate?: StringNullableFilter<"Vehicle"> | string | null
    type?: StringFilter<"Vehicle"> | string
    status?: StringFilter<"Vehicle"> | string
    userId?: StringFilter<"Vehicle"> | string
    createdAt?: DateTimeFilter<"Vehicle"> | Date | string
    updatedAt?: DateTimeFilter<"Vehicle"> | Date | string
  }

  export type LocationUpsertWithWhereUniqueWithoutUserInput = {
    where: LocationWhereUniqueInput
    update: XOR<LocationUpdateWithoutUserInput, LocationUncheckedUpdateWithoutUserInput>
    create: XOR<LocationCreateWithoutUserInput, LocationUncheckedCreateWithoutUserInput>
  }

  export type LocationUpdateWithWhereUniqueWithoutUserInput = {
    where: LocationWhereUniqueInput
    data: XOR<LocationUpdateWithoutUserInput, LocationUncheckedUpdateWithoutUserInput>
  }

  export type LocationUpdateManyWithWhereWithoutUserInput = {
    where: LocationScalarWhereInput
    data: XOR<LocationUpdateManyMutationInput, LocationUncheckedUpdateManyWithoutUserInput>
  }

  export type LocationScalarWhereInput = {
    AND?: LocationScalarWhereInput | LocationScalarWhereInput[]
    OR?: LocationScalarWhereInput[]
    NOT?: LocationScalarWhereInput | LocationScalarWhereInput[]
    id?: StringFilter<"Location"> | string
    vehicleId?: StringNullableFilter<"Location"> | string | null
    userId?: StringNullableFilter<"Location"> | string | null
    latitude?: FloatFilter<"Location"> | number
    longitude?: FloatFilter<"Location"> | number
    accuracy?: FloatNullableFilter<"Location"> | number | null
    speed?: FloatNullableFilter<"Location"> | number | null
    heading?: FloatNullableFilter<"Location"> | number | null
    timestamp?: DateTimeFilter<"Location"> | Date | string
  }

  export type RouteUpsertWithWhereUniqueWithoutUserInput = {
    where: RouteWhereUniqueInput
    update: XOR<RouteUpdateWithoutUserInput, RouteUncheckedUpdateWithoutUserInput>
    create: XOR<RouteCreateWithoutUserInput, RouteUncheckedCreateWithoutUserInput>
  }

  export type RouteUpdateWithWhereUniqueWithoutUserInput = {
    where: RouteWhereUniqueInput
    data: XOR<RouteUpdateWithoutUserInput, RouteUncheckedUpdateWithoutUserInput>
  }

  export type RouteUpdateManyWithWhereWithoutUserInput = {
    where: RouteScalarWhereInput
    data: XOR<RouteUpdateManyMutationInput, RouteUncheckedUpdateManyWithoutUserInput>
  }

  export type RouteScalarWhereInput = {
    AND?: RouteScalarWhereInput | RouteScalarWhereInput[]
    OR?: RouteScalarWhereInput[]
    NOT?: RouteScalarWhereInput | RouteScalarWhereInput[]
    id?: StringFilter<"Route"> | string
    vehicleId?: StringNullableFilter<"Route"> | string | null
    userId?: StringFilter<"Route"> | string
    name?: StringNullableFilter<"Route"> | string | null
    startLat?: FloatFilter<"Route"> | number
    startLng?: FloatFilter<"Route"> | number
    endLat?: FloatFilter<"Route"> | number
    endLng?: FloatFilter<"Route"> | number
    waypoints?: JsonNullableFilter<"Route">
    distance?: FloatNullableFilter<"Route"> | number | null
    duration?: IntNullableFilter<"Route"> | number | null
    polyline?: StringNullableFilter<"Route"> | string | null
    status?: StringFilter<"Route"> | string
    startedAt?: DateTimeNullableFilter<"Route"> | Date | string | null
    completedAt?: DateTimeNullableFilter<"Route"> | Date | string | null
    createdAt?: DateTimeFilter<"Route"> | Date | string
    updatedAt?: DateTimeFilter<"Route"> | Date | string
  }

  export type PlaceUpsertWithWhereUniqueWithoutUserInput = {
    where: PlaceWhereUniqueInput
    update: XOR<PlaceUpdateWithoutUserInput, PlaceUncheckedUpdateWithoutUserInput>
    create: XOR<PlaceCreateWithoutUserInput, PlaceUncheckedCreateWithoutUserInput>
  }

  export type PlaceUpdateWithWhereUniqueWithoutUserInput = {
    where: PlaceWhereUniqueInput
    data: XOR<PlaceUpdateWithoutUserInput, PlaceUncheckedUpdateWithoutUserInput>
  }

  export type PlaceUpdateManyWithWhereWithoutUserInput = {
    where: PlaceScalarWhereInput
    data: XOR<PlaceUpdateManyMutationInput, PlaceUncheckedUpdateManyWithoutUserInput>
  }

  export type PlaceScalarWhereInput = {
    AND?: PlaceScalarWhereInput | PlaceScalarWhereInput[]
    OR?: PlaceScalarWhereInput[]
    NOT?: PlaceScalarWhereInput | PlaceScalarWhereInput[]
    id?: StringFilter<"Place"> | string
    name?: StringFilter<"Place"> | string
    placeNameEn?: StringNullableFilter<"Place"> | string | null
    placeNameLocal?: StringNullableFilter<"Place"> | string | null
    category?: StringFilter<"Place"> | string
    latitude?: FloatFilter<"Place"> | number
    longitude?: FloatFilter<"Place"> | number
    zoomLevel?: FloatFilter<"Place"> | number
    userId?: StringFilter<"Place"> | string
    userName?: StringNullableFilter<"Place"> | string | null
    userEmail?: StringNullableFilter<"Place"> | string | null
    source?: StringFilter<"Place"> | string
    approvalStatus?: StringFilter<"Place"> | string
    approvedAt?: DateTimeNullableFilter<"Place"> | Date | string | null
    autoApproveAt?: DateTimeNullableFilter<"Place"> | Date | string | null
    googlePlaceId?: StringNullableFilter<"Place"> | string | null
    googleType?: StringNullableFilter<"Place"> | string | null
    googleTypes?: JsonNullableFilter<"Place">
    googleMapsUrl?: StringNullableFilter<"Place"> | string | null
    vicinity?: StringNullableFilter<"Place"> | string | null
    fullAddress?: StringNullableFilter<"Place"> | string | null
    village?: StringNullableFilter<"Place"> | string | null
    taluk?: StringNullableFilter<"Place"> | string | null
    district?: StringNullableFilter<"Place"> | string | null
    state?: StringNullableFilter<"Place"> | string | null
    country?: StringNullableFilter<"Place"> | string | null
    pincode?: StringNullableFilter<"Place"> | string | null
    phone?: StringNullableFilter<"Place"> | string | null
    website?: StringNullableFilter<"Place"> | string | null
    rating?: FloatNullableFilter<"Place"> | number | null
    reviewCount?: IntNullableFilter<"Place"> | number | null
    openingHours?: JsonNullableFilter<"Place">
    businessStatus?: StringNullableFilter<"Place"> | string | null
    description?: StringNullableFilter<"Place"> | string | null
    googleReviews?: JsonNullableFilter<"Place">
    nearbyPlaces?: JsonNullableFilter<"Place">
    googlePhotos?: JsonNullableFilter<"Place">
    mapRenderingConfig?: JsonNullableFilter<"Place">
    extractedAt?: DateTimeNullableFilter<"Place"> | Date | string | null
    createdAt?: DateTimeFilter<"Place"> | Date | string
    updatedAt?: DateTimeFilter<"Place"> | Date | string
  }

  export type PlaceReviewUpsertWithWhereUniqueWithoutUserInput = {
    where: PlaceReviewWhereUniqueInput
    update: XOR<PlaceReviewUpdateWithoutUserInput, PlaceReviewUncheckedUpdateWithoutUserInput>
    create: XOR<PlaceReviewCreateWithoutUserInput, PlaceReviewUncheckedCreateWithoutUserInput>
  }

  export type PlaceReviewUpdateWithWhereUniqueWithoutUserInput = {
    where: PlaceReviewWhereUniqueInput
    data: XOR<PlaceReviewUpdateWithoutUserInput, PlaceReviewUncheckedUpdateWithoutUserInput>
  }

  export type PlaceReviewUpdateManyWithWhereWithoutUserInput = {
    where: PlaceReviewScalarWhereInput
    data: XOR<PlaceReviewUpdateManyMutationInput, PlaceReviewUncheckedUpdateManyWithoutUserInput>
  }

  export type PlaceReviewScalarWhereInput = {
    AND?: PlaceReviewScalarWhereInput | PlaceReviewScalarWhereInput[]
    OR?: PlaceReviewScalarWhereInput[]
    NOT?: PlaceReviewScalarWhereInput | PlaceReviewScalarWhereInput[]
    id?: StringFilter<"PlaceReview"> | string
    placeId?: StringFilter<"PlaceReview"> | string
    userId?: StringFilter<"PlaceReview"> | string
    userName?: StringNullableFilter<"PlaceReview"> | string | null
    rating?: IntFilter<"PlaceReview"> | number
    comment?: StringNullableFilter<"PlaceReview"> | string | null
    createdAt?: DateTimeFilter<"PlaceReview"> | Date | string
    updatedAt?: DateTimeFilter<"PlaceReview"> | Date | string
  }

  export type PlacePhotoUpsertWithWhereUniqueWithoutUserInput = {
    where: PlacePhotoWhereUniqueInput
    update: XOR<PlacePhotoUpdateWithoutUserInput, PlacePhotoUncheckedUpdateWithoutUserInput>
    create: XOR<PlacePhotoCreateWithoutUserInput, PlacePhotoUncheckedCreateWithoutUserInput>
  }

  export type PlacePhotoUpdateWithWhereUniqueWithoutUserInput = {
    where: PlacePhotoWhereUniqueInput
    data: XOR<PlacePhotoUpdateWithoutUserInput, PlacePhotoUncheckedUpdateWithoutUserInput>
  }

  export type PlacePhotoUpdateManyWithWhereWithoutUserInput = {
    where: PlacePhotoScalarWhereInput
    data: XOR<PlacePhotoUpdateManyMutationInput, PlacePhotoUncheckedUpdateManyWithoutUserInput>
  }

  export type PlacePhotoScalarWhereInput = {
    AND?: PlacePhotoScalarWhereInput | PlacePhotoScalarWhereInput[]
    OR?: PlacePhotoScalarWhereInput[]
    NOT?: PlacePhotoScalarWhereInput | PlacePhotoScalarWhereInput[]
    id?: StringFilter<"PlacePhoto"> | string
    placeId?: StringFilter<"PlacePhoto"> | string
    userId?: StringFilter<"PlacePhoto"> | string
    userName?: StringNullableFilter<"PlacePhoto"> | string | null
    dataUrl?: StringFilter<"PlacePhoto"> | string
    caption?: StringNullableFilter<"PlacePhoto"> | string | null
    createdAt?: DateTimeFilter<"PlacePhoto"> | Date | string
  }

  export type UserCreateWithoutOtpVerificationsInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionCreateNestedManyWithoutUserInput
    vehicles?: VehicleCreateNestedManyWithoutUserInput
    locations?: LocationCreateNestedManyWithoutUserInput
    routes?: RouteCreateNestedManyWithoutUserInput
    places?: PlaceCreateNestedManyWithoutUserInput
    placeReviews?: PlaceReviewCreateNestedManyWithoutUserInput
    placePhotos?: PlacePhotoCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutOtpVerificationsInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    vehicles?: VehicleUncheckedCreateNestedManyWithoutUserInput
    locations?: LocationUncheckedCreateNestedManyWithoutUserInput
    routes?: RouteUncheckedCreateNestedManyWithoutUserInput
    places?: PlaceUncheckedCreateNestedManyWithoutUserInput
    placeReviews?: PlaceReviewUncheckedCreateNestedManyWithoutUserInput
    placePhotos?: PlacePhotoUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutOtpVerificationsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutOtpVerificationsInput, UserUncheckedCreateWithoutOtpVerificationsInput>
  }

  export type UserUpsertWithoutOtpVerificationsInput = {
    update: XOR<UserUpdateWithoutOtpVerificationsInput, UserUncheckedUpdateWithoutOtpVerificationsInput>
    create: XOR<UserCreateWithoutOtpVerificationsInput, UserUncheckedCreateWithoutOtpVerificationsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutOtpVerificationsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutOtpVerificationsInput, UserUncheckedUpdateWithoutOtpVerificationsInput>
  }

  export type UserUpdateWithoutOtpVerificationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUpdateManyWithoutUserNestedInput
    vehicles?: VehicleUpdateManyWithoutUserNestedInput
    locations?: LocationUpdateManyWithoutUserNestedInput
    routes?: RouteUpdateManyWithoutUserNestedInput
    places?: PlaceUpdateManyWithoutUserNestedInput
    placeReviews?: PlaceReviewUpdateManyWithoutUserNestedInput
    placePhotos?: PlacePhotoUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutOtpVerificationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    vehicles?: VehicleUncheckedUpdateManyWithoutUserNestedInput
    locations?: LocationUncheckedUpdateManyWithoutUserNestedInput
    routes?: RouteUncheckedUpdateManyWithoutUserNestedInput
    places?: PlaceUncheckedUpdateManyWithoutUserNestedInput
    placeReviews?: PlaceReviewUncheckedUpdateManyWithoutUserNestedInput
    placePhotos?: PlacePhotoUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateWithoutSessionsInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    otpVerifications?: OTPVerificationCreateNestedManyWithoutUserInput
    vehicles?: VehicleCreateNestedManyWithoutUserInput
    locations?: LocationCreateNestedManyWithoutUserInput
    routes?: RouteCreateNestedManyWithoutUserInput
    places?: PlaceCreateNestedManyWithoutUserInput
    placeReviews?: PlaceReviewCreateNestedManyWithoutUserInput
    placePhotos?: PlacePhotoCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutSessionsInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    otpVerifications?: OTPVerificationUncheckedCreateNestedManyWithoutUserInput
    vehicles?: VehicleUncheckedCreateNestedManyWithoutUserInput
    locations?: LocationUncheckedCreateNestedManyWithoutUserInput
    routes?: RouteUncheckedCreateNestedManyWithoutUserInput
    places?: PlaceUncheckedCreateNestedManyWithoutUserInput
    placeReviews?: PlaceReviewUncheckedCreateNestedManyWithoutUserInput
    placePhotos?: PlacePhotoUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutSessionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
  }

  export type UserUpsertWithoutSessionsInput = {
    update: XOR<UserUpdateWithoutSessionsInput, UserUncheckedUpdateWithoutSessionsInput>
    create: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSessionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSessionsInput, UserUncheckedUpdateWithoutSessionsInput>
  }

  export type UserUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpVerifications?: OTPVerificationUpdateManyWithoutUserNestedInput
    vehicles?: VehicleUpdateManyWithoutUserNestedInput
    locations?: LocationUpdateManyWithoutUserNestedInput
    routes?: RouteUpdateManyWithoutUserNestedInput
    places?: PlaceUpdateManyWithoutUserNestedInput
    placeReviews?: PlaceReviewUpdateManyWithoutUserNestedInput
    placePhotos?: PlacePhotoUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpVerifications?: OTPVerificationUncheckedUpdateManyWithoutUserNestedInput
    vehicles?: VehicleUncheckedUpdateManyWithoutUserNestedInput
    locations?: LocationUncheckedUpdateManyWithoutUserNestedInput
    routes?: RouteUncheckedUpdateManyWithoutUserNestedInput
    places?: PlaceUncheckedUpdateManyWithoutUserNestedInput
    placeReviews?: PlaceReviewUncheckedUpdateManyWithoutUserNestedInput
    placePhotos?: PlacePhotoUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateWithoutVehiclesInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    otpVerifications?: OTPVerificationCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
    locations?: LocationCreateNestedManyWithoutUserInput
    routes?: RouteCreateNestedManyWithoutUserInput
    places?: PlaceCreateNestedManyWithoutUserInput
    placeReviews?: PlaceReviewCreateNestedManyWithoutUserInput
    placePhotos?: PlacePhotoCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutVehiclesInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    otpVerifications?: OTPVerificationUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    locations?: LocationUncheckedCreateNestedManyWithoutUserInput
    routes?: RouteUncheckedCreateNestedManyWithoutUserInput
    places?: PlaceUncheckedCreateNestedManyWithoutUserInput
    placeReviews?: PlaceReviewUncheckedCreateNestedManyWithoutUserInput
    placePhotos?: PlacePhotoUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutVehiclesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutVehiclesInput, UserUncheckedCreateWithoutVehiclesInput>
  }

  export type LocationCreateWithoutVehicleInput = {
    id?: string
    latitude: number
    longitude: number
    accuracy?: number | null
    speed?: number | null
    heading?: number | null
    timestamp?: Date | string
    user?: UserCreateNestedOneWithoutLocationsInput
  }

  export type LocationUncheckedCreateWithoutVehicleInput = {
    id?: string
    userId?: string | null
    latitude: number
    longitude: number
    accuracy?: number | null
    speed?: number | null
    heading?: number | null
    timestamp?: Date | string
  }

  export type LocationCreateOrConnectWithoutVehicleInput = {
    where: LocationWhereUniqueInput
    create: XOR<LocationCreateWithoutVehicleInput, LocationUncheckedCreateWithoutVehicleInput>
  }

  export type LocationCreateManyVehicleInputEnvelope = {
    data: LocationCreateManyVehicleInput | LocationCreateManyVehicleInput[]
    skipDuplicates?: boolean
  }

  export type RouteCreateWithoutVehicleInput = {
    id?: string
    name?: string | null
    startLat: number
    startLng: number
    endLat: number
    endLng: number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: number | null
    duration?: number | null
    polyline?: string | null
    status?: string
    startedAt?: Date | string | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutRoutesInput
  }

  export type RouteUncheckedCreateWithoutVehicleInput = {
    id?: string
    userId: string
    name?: string | null
    startLat: number
    startLng: number
    endLat: number
    endLng: number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: number | null
    duration?: number | null
    polyline?: string | null
    status?: string
    startedAt?: Date | string | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RouteCreateOrConnectWithoutVehicleInput = {
    where: RouteWhereUniqueInput
    create: XOR<RouteCreateWithoutVehicleInput, RouteUncheckedCreateWithoutVehicleInput>
  }

  export type RouteCreateManyVehicleInputEnvelope = {
    data: RouteCreateManyVehicleInput | RouteCreateManyVehicleInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutVehiclesInput = {
    update: XOR<UserUpdateWithoutVehiclesInput, UserUncheckedUpdateWithoutVehiclesInput>
    create: XOR<UserCreateWithoutVehiclesInput, UserUncheckedCreateWithoutVehiclesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutVehiclesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutVehiclesInput, UserUncheckedUpdateWithoutVehiclesInput>
  }

  export type UserUpdateWithoutVehiclesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpVerifications?: OTPVerificationUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
    locations?: LocationUpdateManyWithoutUserNestedInput
    routes?: RouteUpdateManyWithoutUserNestedInput
    places?: PlaceUpdateManyWithoutUserNestedInput
    placeReviews?: PlaceReviewUpdateManyWithoutUserNestedInput
    placePhotos?: PlacePhotoUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutVehiclesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpVerifications?: OTPVerificationUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    locations?: LocationUncheckedUpdateManyWithoutUserNestedInput
    routes?: RouteUncheckedUpdateManyWithoutUserNestedInput
    places?: PlaceUncheckedUpdateManyWithoutUserNestedInput
    placeReviews?: PlaceReviewUncheckedUpdateManyWithoutUserNestedInput
    placePhotos?: PlacePhotoUncheckedUpdateManyWithoutUserNestedInput
  }

  export type LocationUpsertWithWhereUniqueWithoutVehicleInput = {
    where: LocationWhereUniqueInput
    update: XOR<LocationUpdateWithoutVehicleInput, LocationUncheckedUpdateWithoutVehicleInput>
    create: XOR<LocationCreateWithoutVehicleInput, LocationUncheckedCreateWithoutVehicleInput>
  }

  export type LocationUpdateWithWhereUniqueWithoutVehicleInput = {
    where: LocationWhereUniqueInput
    data: XOR<LocationUpdateWithoutVehicleInput, LocationUncheckedUpdateWithoutVehicleInput>
  }

  export type LocationUpdateManyWithWhereWithoutVehicleInput = {
    where: LocationScalarWhereInput
    data: XOR<LocationUpdateManyMutationInput, LocationUncheckedUpdateManyWithoutVehicleInput>
  }

  export type RouteUpsertWithWhereUniqueWithoutVehicleInput = {
    where: RouteWhereUniqueInput
    update: XOR<RouteUpdateWithoutVehicleInput, RouteUncheckedUpdateWithoutVehicleInput>
    create: XOR<RouteCreateWithoutVehicleInput, RouteUncheckedCreateWithoutVehicleInput>
  }

  export type RouteUpdateWithWhereUniqueWithoutVehicleInput = {
    where: RouteWhereUniqueInput
    data: XOR<RouteUpdateWithoutVehicleInput, RouteUncheckedUpdateWithoutVehicleInput>
  }

  export type RouteUpdateManyWithWhereWithoutVehicleInput = {
    where: RouteScalarWhereInput
    data: XOR<RouteUpdateManyMutationInput, RouteUncheckedUpdateManyWithoutVehicleInput>
  }

  export type VehicleCreateWithoutLocationsInput = {
    id?: string
    name: string
    licensePlate?: string | null
    type: string
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutVehiclesInput
    routes?: RouteCreateNestedManyWithoutVehicleInput
  }

  export type VehicleUncheckedCreateWithoutLocationsInput = {
    id?: string
    name: string
    licensePlate?: string | null
    type: string
    status?: string
    userId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    routes?: RouteUncheckedCreateNestedManyWithoutVehicleInput
  }

  export type VehicleCreateOrConnectWithoutLocationsInput = {
    where: VehicleWhereUniqueInput
    create: XOR<VehicleCreateWithoutLocationsInput, VehicleUncheckedCreateWithoutLocationsInput>
  }

  export type UserCreateWithoutLocationsInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    otpVerifications?: OTPVerificationCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
    vehicles?: VehicleCreateNestedManyWithoutUserInput
    routes?: RouteCreateNestedManyWithoutUserInput
    places?: PlaceCreateNestedManyWithoutUserInput
    placeReviews?: PlaceReviewCreateNestedManyWithoutUserInput
    placePhotos?: PlacePhotoCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutLocationsInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    otpVerifications?: OTPVerificationUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    vehicles?: VehicleUncheckedCreateNestedManyWithoutUserInput
    routes?: RouteUncheckedCreateNestedManyWithoutUserInput
    places?: PlaceUncheckedCreateNestedManyWithoutUserInput
    placeReviews?: PlaceReviewUncheckedCreateNestedManyWithoutUserInput
    placePhotos?: PlacePhotoUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutLocationsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutLocationsInput, UserUncheckedCreateWithoutLocationsInput>
  }

  export type VehicleUpsertWithoutLocationsInput = {
    update: XOR<VehicleUpdateWithoutLocationsInput, VehicleUncheckedUpdateWithoutLocationsInput>
    create: XOR<VehicleCreateWithoutLocationsInput, VehicleUncheckedCreateWithoutLocationsInput>
    where?: VehicleWhereInput
  }

  export type VehicleUpdateToOneWithWhereWithoutLocationsInput = {
    where?: VehicleWhereInput
    data: XOR<VehicleUpdateWithoutLocationsInput, VehicleUncheckedUpdateWithoutLocationsInput>
  }

  export type VehicleUpdateWithoutLocationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    licensePlate?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutVehiclesNestedInput
    routes?: RouteUpdateManyWithoutVehicleNestedInput
  }

  export type VehicleUncheckedUpdateWithoutLocationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    licensePlate?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    routes?: RouteUncheckedUpdateManyWithoutVehicleNestedInput
  }

  export type UserUpsertWithoutLocationsInput = {
    update: XOR<UserUpdateWithoutLocationsInput, UserUncheckedUpdateWithoutLocationsInput>
    create: XOR<UserCreateWithoutLocationsInput, UserUncheckedCreateWithoutLocationsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutLocationsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutLocationsInput, UserUncheckedUpdateWithoutLocationsInput>
  }

  export type UserUpdateWithoutLocationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpVerifications?: OTPVerificationUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
    vehicles?: VehicleUpdateManyWithoutUserNestedInput
    routes?: RouteUpdateManyWithoutUserNestedInput
    places?: PlaceUpdateManyWithoutUserNestedInput
    placeReviews?: PlaceReviewUpdateManyWithoutUserNestedInput
    placePhotos?: PlacePhotoUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutLocationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpVerifications?: OTPVerificationUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    vehicles?: VehicleUncheckedUpdateManyWithoutUserNestedInput
    routes?: RouteUncheckedUpdateManyWithoutUserNestedInput
    places?: PlaceUncheckedUpdateManyWithoutUserNestedInput
    placeReviews?: PlaceReviewUncheckedUpdateManyWithoutUserNestedInput
    placePhotos?: PlacePhotoUncheckedUpdateManyWithoutUserNestedInput
  }

  export type VehicleCreateWithoutRoutesInput = {
    id?: string
    name: string
    licensePlate?: string | null
    type: string
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutVehiclesInput
    locations?: LocationCreateNestedManyWithoutVehicleInput
  }

  export type VehicleUncheckedCreateWithoutRoutesInput = {
    id?: string
    name: string
    licensePlate?: string | null
    type: string
    status?: string
    userId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    locations?: LocationUncheckedCreateNestedManyWithoutVehicleInput
  }

  export type VehicleCreateOrConnectWithoutRoutesInput = {
    where: VehicleWhereUniqueInput
    create: XOR<VehicleCreateWithoutRoutesInput, VehicleUncheckedCreateWithoutRoutesInput>
  }

  export type UserCreateWithoutRoutesInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    otpVerifications?: OTPVerificationCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
    vehicles?: VehicleCreateNestedManyWithoutUserInput
    locations?: LocationCreateNestedManyWithoutUserInput
    places?: PlaceCreateNestedManyWithoutUserInput
    placeReviews?: PlaceReviewCreateNestedManyWithoutUserInput
    placePhotos?: PlacePhotoCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutRoutesInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    otpVerifications?: OTPVerificationUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    vehicles?: VehicleUncheckedCreateNestedManyWithoutUserInput
    locations?: LocationUncheckedCreateNestedManyWithoutUserInput
    places?: PlaceUncheckedCreateNestedManyWithoutUserInput
    placeReviews?: PlaceReviewUncheckedCreateNestedManyWithoutUserInput
    placePhotos?: PlacePhotoUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutRoutesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutRoutesInput, UserUncheckedCreateWithoutRoutesInput>
  }

  export type VehicleUpsertWithoutRoutesInput = {
    update: XOR<VehicleUpdateWithoutRoutesInput, VehicleUncheckedUpdateWithoutRoutesInput>
    create: XOR<VehicleCreateWithoutRoutesInput, VehicleUncheckedCreateWithoutRoutesInput>
    where?: VehicleWhereInput
  }

  export type VehicleUpdateToOneWithWhereWithoutRoutesInput = {
    where?: VehicleWhereInput
    data: XOR<VehicleUpdateWithoutRoutesInput, VehicleUncheckedUpdateWithoutRoutesInput>
  }

  export type VehicleUpdateWithoutRoutesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    licensePlate?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutVehiclesNestedInput
    locations?: LocationUpdateManyWithoutVehicleNestedInput
  }

  export type VehicleUncheckedUpdateWithoutRoutesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    licensePlate?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    locations?: LocationUncheckedUpdateManyWithoutVehicleNestedInput
  }

  export type UserUpsertWithoutRoutesInput = {
    update: XOR<UserUpdateWithoutRoutesInput, UserUncheckedUpdateWithoutRoutesInput>
    create: XOR<UserCreateWithoutRoutesInput, UserUncheckedCreateWithoutRoutesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutRoutesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutRoutesInput, UserUncheckedUpdateWithoutRoutesInput>
  }

  export type UserUpdateWithoutRoutesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpVerifications?: OTPVerificationUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
    vehicles?: VehicleUpdateManyWithoutUserNestedInput
    locations?: LocationUpdateManyWithoutUserNestedInput
    places?: PlaceUpdateManyWithoutUserNestedInput
    placeReviews?: PlaceReviewUpdateManyWithoutUserNestedInput
    placePhotos?: PlacePhotoUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutRoutesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpVerifications?: OTPVerificationUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    vehicles?: VehicleUncheckedUpdateManyWithoutUserNestedInput
    locations?: LocationUncheckedUpdateManyWithoutUserNestedInput
    places?: PlaceUncheckedUpdateManyWithoutUserNestedInput
    placeReviews?: PlaceReviewUncheckedUpdateManyWithoutUserNestedInput
    placePhotos?: PlacePhotoUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateWithoutPlacesInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    otpVerifications?: OTPVerificationCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
    vehicles?: VehicleCreateNestedManyWithoutUserInput
    locations?: LocationCreateNestedManyWithoutUserInput
    routes?: RouteCreateNestedManyWithoutUserInput
    placeReviews?: PlaceReviewCreateNestedManyWithoutUserInput
    placePhotos?: PlacePhotoCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutPlacesInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    otpVerifications?: OTPVerificationUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    vehicles?: VehicleUncheckedCreateNestedManyWithoutUserInput
    locations?: LocationUncheckedCreateNestedManyWithoutUserInput
    routes?: RouteUncheckedCreateNestedManyWithoutUserInput
    placeReviews?: PlaceReviewUncheckedCreateNestedManyWithoutUserInput
    placePhotos?: PlacePhotoUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutPlacesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutPlacesInput, UserUncheckedCreateWithoutPlacesInput>
  }

  export type PlaceReviewCreateWithoutPlaceInput = {
    id?: string
    userName?: string | null
    rating: number
    comment?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutPlaceReviewsInput
  }

  export type PlaceReviewUncheckedCreateWithoutPlaceInput = {
    id?: string
    userId: string
    userName?: string | null
    rating: number
    comment?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PlaceReviewCreateOrConnectWithoutPlaceInput = {
    where: PlaceReviewWhereUniqueInput
    create: XOR<PlaceReviewCreateWithoutPlaceInput, PlaceReviewUncheckedCreateWithoutPlaceInput>
  }

  export type PlaceReviewCreateManyPlaceInputEnvelope = {
    data: PlaceReviewCreateManyPlaceInput | PlaceReviewCreateManyPlaceInput[]
    skipDuplicates?: boolean
  }

  export type PlacePhotoCreateWithoutPlaceInput = {
    id?: string
    userName?: string | null
    dataUrl: string
    caption?: string | null
    createdAt?: Date | string
    user: UserCreateNestedOneWithoutPlacePhotosInput
  }

  export type PlacePhotoUncheckedCreateWithoutPlaceInput = {
    id?: string
    userId: string
    userName?: string | null
    dataUrl: string
    caption?: string | null
    createdAt?: Date | string
  }

  export type PlacePhotoCreateOrConnectWithoutPlaceInput = {
    where: PlacePhotoWhereUniqueInput
    create: XOR<PlacePhotoCreateWithoutPlaceInput, PlacePhotoUncheckedCreateWithoutPlaceInput>
  }

  export type PlacePhotoCreateManyPlaceInputEnvelope = {
    data: PlacePhotoCreateManyPlaceInput | PlacePhotoCreateManyPlaceInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutPlacesInput = {
    update: XOR<UserUpdateWithoutPlacesInput, UserUncheckedUpdateWithoutPlacesInput>
    create: XOR<UserCreateWithoutPlacesInput, UserUncheckedCreateWithoutPlacesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutPlacesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutPlacesInput, UserUncheckedUpdateWithoutPlacesInput>
  }

  export type UserUpdateWithoutPlacesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpVerifications?: OTPVerificationUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
    vehicles?: VehicleUpdateManyWithoutUserNestedInput
    locations?: LocationUpdateManyWithoutUserNestedInput
    routes?: RouteUpdateManyWithoutUserNestedInput
    placeReviews?: PlaceReviewUpdateManyWithoutUserNestedInput
    placePhotos?: PlacePhotoUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutPlacesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpVerifications?: OTPVerificationUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    vehicles?: VehicleUncheckedUpdateManyWithoutUserNestedInput
    locations?: LocationUncheckedUpdateManyWithoutUserNestedInput
    routes?: RouteUncheckedUpdateManyWithoutUserNestedInput
    placeReviews?: PlaceReviewUncheckedUpdateManyWithoutUserNestedInput
    placePhotos?: PlacePhotoUncheckedUpdateManyWithoutUserNestedInput
  }

  export type PlaceReviewUpsertWithWhereUniqueWithoutPlaceInput = {
    where: PlaceReviewWhereUniqueInput
    update: XOR<PlaceReviewUpdateWithoutPlaceInput, PlaceReviewUncheckedUpdateWithoutPlaceInput>
    create: XOR<PlaceReviewCreateWithoutPlaceInput, PlaceReviewUncheckedCreateWithoutPlaceInput>
  }

  export type PlaceReviewUpdateWithWhereUniqueWithoutPlaceInput = {
    where: PlaceReviewWhereUniqueInput
    data: XOR<PlaceReviewUpdateWithoutPlaceInput, PlaceReviewUncheckedUpdateWithoutPlaceInput>
  }

  export type PlaceReviewUpdateManyWithWhereWithoutPlaceInput = {
    where: PlaceReviewScalarWhereInput
    data: XOR<PlaceReviewUpdateManyMutationInput, PlaceReviewUncheckedUpdateManyWithoutPlaceInput>
  }

  export type PlacePhotoUpsertWithWhereUniqueWithoutPlaceInput = {
    where: PlacePhotoWhereUniqueInput
    update: XOR<PlacePhotoUpdateWithoutPlaceInput, PlacePhotoUncheckedUpdateWithoutPlaceInput>
    create: XOR<PlacePhotoCreateWithoutPlaceInput, PlacePhotoUncheckedCreateWithoutPlaceInput>
  }

  export type PlacePhotoUpdateWithWhereUniqueWithoutPlaceInput = {
    where: PlacePhotoWhereUniqueInput
    data: XOR<PlacePhotoUpdateWithoutPlaceInput, PlacePhotoUncheckedUpdateWithoutPlaceInput>
  }

  export type PlacePhotoUpdateManyWithWhereWithoutPlaceInput = {
    where: PlacePhotoScalarWhereInput
    data: XOR<PlacePhotoUpdateManyMutationInput, PlacePhotoUncheckedUpdateManyWithoutPlaceInput>
  }

  export type PlaceCreateWithoutReviewsInput = {
    id?: string
    name: string
    placeNameEn?: string | null
    placeNameLocal?: string | null
    category: string
    latitude: number
    longitude: number
    zoomLevel?: number
    userName?: string | null
    userEmail?: string | null
    source?: string
    approvalStatus?: string
    approvedAt?: Date | string | null
    autoApproveAt?: Date | string | null
    googlePlaceId?: string | null
    googleType?: string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: string | null
    vicinity?: string | null
    fullAddress?: string | null
    village?: string | null
    taluk?: string | null
    district?: string | null
    state?: string | null
    country?: string | null
    pincode?: string | null
    phone?: string | null
    website?: string | null
    rating?: number | null
    reviewCount?: number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: string | null
    description?: string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutPlacesInput
    photos?: PlacePhotoCreateNestedManyWithoutPlaceInput
  }

  export type PlaceUncheckedCreateWithoutReviewsInput = {
    id?: string
    name: string
    placeNameEn?: string | null
    placeNameLocal?: string | null
    category: string
    latitude: number
    longitude: number
    zoomLevel?: number
    userId: string
    userName?: string | null
    userEmail?: string | null
    source?: string
    approvalStatus?: string
    approvedAt?: Date | string | null
    autoApproveAt?: Date | string | null
    googlePlaceId?: string | null
    googleType?: string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: string | null
    vicinity?: string | null
    fullAddress?: string | null
    village?: string | null
    taluk?: string | null
    district?: string | null
    state?: string | null
    country?: string | null
    pincode?: string | null
    phone?: string | null
    website?: string | null
    rating?: number | null
    reviewCount?: number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: string | null
    description?: string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    photos?: PlacePhotoUncheckedCreateNestedManyWithoutPlaceInput
  }

  export type PlaceCreateOrConnectWithoutReviewsInput = {
    where: PlaceWhereUniqueInput
    create: XOR<PlaceCreateWithoutReviewsInput, PlaceUncheckedCreateWithoutReviewsInput>
  }

  export type UserCreateWithoutPlaceReviewsInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    otpVerifications?: OTPVerificationCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
    vehicles?: VehicleCreateNestedManyWithoutUserInput
    locations?: LocationCreateNestedManyWithoutUserInput
    routes?: RouteCreateNestedManyWithoutUserInput
    places?: PlaceCreateNestedManyWithoutUserInput
    placePhotos?: PlacePhotoCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutPlaceReviewsInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    otpVerifications?: OTPVerificationUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    vehicles?: VehicleUncheckedCreateNestedManyWithoutUserInput
    locations?: LocationUncheckedCreateNestedManyWithoutUserInput
    routes?: RouteUncheckedCreateNestedManyWithoutUserInput
    places?: PlaceUncheckedCreateNestedManyWithoutUserInput
    placePhotos?: PlacePhotoUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutPlaceReviewsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutPlaceReviewsInput, UserUncheckedCreateWithoutPlaceReviewsInput>
  }

  export type PlaceUpsertWithoutReviewsInput = {
    update: XOR<PlaceUpdateWithoutReviewsInput, PlaceUncheckedUpdateWithoutReviewsInput>
    create: XOR<PlaceCreateWithoutReviewsInput, PlaceUncheckedCreateWithoutReviewsInput>
    where?: PlaceWhereInput
  }

  export type PlaceUpdateToOneWithWhereWithoutReviewsInput = {
    where?: PlaceWhereInput
    data: XOR<PlaceUpdateWithoutReviewsInput, PlaceUncheckedUpdateWithoutReviewsInput>
  }

  export type PlaceUpdateWithoutReviewsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    placeNameEn?: NullableStringFieldUpdateOperationsInput | string | null
    placeNameLocal?: NullableStringFieldUpdateOperationsInput | string | null
    category?: StringFieldUpdateOperationsInput | string
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    zoomLevel?: FloatFieldUpdateOperationsInput | number
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    userEmail?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    approvalStatus?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    autoApproveAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    googlePlaceId?: NullableStringFieldUpdateOperationsInput | string | null
    googleType?: NullableStringFieldUpdateOperationsInput | string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vicinity?: NullableStringFieldUpdateOperationsInput | string | null
    fullAddress?: NullableStringFieldUpdateOperationsInput | string | null
    village?: NullableStringFieldUpdateOperationsInput | string | null
    taluk?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    pincode?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    website?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableFloatFieldUpdateOperationsInput | number | null
    reviewCount?: NullableIntFieldUpdateOperationsInput | number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutPlacesNestedInput
    photos?: PlacePhotoUpdateManyWithoutPlaceNestedInput
  }

  export type PlaceUncheckedUpdateWithoutReviewsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    placeNameEn?: NullableStringFieldUpdateOperationsInput | string | null
    placeNameLocal?: NullableStringFieldUpdateOperationsInput | string | null
    category?: StringFieldUpdateOperationsInput | string
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    zoomLevel?: FloatFieldUpdateOperationsInput | number
    userId?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    userEmail?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    approvalStatus?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    autoApproveAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    googlePlaceId?: NullableStringFieldUpdateOperationsInput | string | null
    googleType?: NullableStringFieldUpdateOperationsInput | string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vicinity?: NullableStringFieldUpdateOperationsInput | string | null
    fullAddress?: NullableStringFieldUpdateOperationsInput | string | null
    village?: NullableStringFieldUpdateOperationsInput | string | null
    taluk?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    pincode?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    website?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableFloatFieldUpdateOperationsInput | number | null
    reviewCount?: NullableIntFieldUpdateOperationsInput | number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    photos?: PlacePhotoUncheckedUpdateManyWithoutPlaceNestedInput
  }

  export type UserUpsertWithoutPlaceReviewsInput = {
    update: XOR<UserUpdateWithoutPlaceReviewsInput, UserUncheckedUpdateWithoutPlaceReviewsInput>
    create: XOR<UserCreateWithoutPlaceReviewsInput, UserUncheckedCreateWithoutPlaceReviewsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutPlaceReviewsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutPlaceReviewsInput, UserUncheckedUpdateWithoutPlaceReviewsInput>
  }

  export type UserUpdateWithoutPlaceReviewsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpVerifications?: OTPVerificationUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
    vehicles?: VehicleUpdateManyWithoutUserNestedInput
    locations?: LocationUpdateManyWithoutUserNestedInput
    routes?: RouteUpdateManyWithoutUserNestedInput
    places?: PlaceUpdateManyWithoutUserNestedInput
    placePhotos?: PlacePhotoUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutPlaceReviewsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpVerifications?: OTPVerificationUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    vehicles?: VehicleUncheckedUpdateManyWithoutUserNestedInput
    locations?: LocationUncheckedUpdateManyWithoutUserNestedInput
    routes?: RouteUncheckedUpdateManyWithoutUserNestedInput
    places?: PlaceUncheckedUpdateManyWithoutUserNestedInput
    placePhotos?: PlacePhotoUncheckedUpdateManyWithoutUserNestedInput
  }

  export type PlaceCreateWithoutPhotosInput = {
    id?: string
    name: string
    placeNameEn?: string | null
    placeNameLocal?: string | null
    category: string
    latitude: number
    longitude: number
    zoomLevel?: number
    userName?: string | null
    userEmail?: string | null
    source?: string
    approvalStatus?: string
    approvedAt?: Date | string | null
    autoApproveAt?: Date | string | null
    googlePlaceId?: string | null
    googleType?: string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: string | null
    vicinity?: string | null
    fullAddress?: string | null
    village?: string | null
    taluk?: string | null
    district?: string | null
    state?: string | null
    country?: string | null
    pincode?: string | null
    phone?: string | null
    website?: string | null
    rating?: number | null
    reviewCount?: number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: string | null
    description?: string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutPlacesInput
    reviews?: PlaceReviewCreateNestedManyWithoutPlaceInput
  }

  export type PlaceUncheckedCreateWithoutPhotosInput = {
    id?: string
    name: string
    placeNameEn?: string | null
    placeNameLocal?: string | null
    category: string
    latitude: number
    longitude: number
    zoomLevel?: number
    userId: string
    userName?: string | null
    userEmail?: string | null
    source?: string
    approvalStatus?: string
    approvedAt?: Date | string | null
    autoApproveAt?: Date | string | null
    googlePlaceId?: string | null
    googleType?: string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: string | null
    vicinity?: string | null
    fullAddress?: string | null
    village?: string | null
    taluk?: string | null
    district?: string | null
    state?: string | null
    country?: string | null
    pincode?: string | null
    phone?: string | null
    website?: string | null
    rating?: number | null
    reviewCount?: number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: string | null
    description?: string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    reviews?: PlaceReviewUncheckedCreateNestedManyWithoutPlaceInput
  }

  export type PlaceCreateOrConnectWithoutPhotosInput = {
    where: PlaceWhereUniqueInput
    create: XOR<PlaceCreateWithoutPhotosInput, PlaceUncheckedCreateWithoutPhotosInput>
  }

  export type UserCreateWithoutPlacePhotosInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    otpVerifications?: OTPVerificationCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
    vehicles?: VehicleCreateNestedManyWithoutUserInput
    locations?: LocationCreateNestedManyWithoutUserInput
    routes?: RouteCreateNestedManyWithoutUserInput
    places?: PlaceCreateNestedManyWithoutUserInput
    placeReviews?: PlaceReviewCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutPlacePhotosInput = {
    id?: string
    name: string
    email: string
    password?: string | null
    googleId?: string | null
    picture?: string | null
    emailVerified?: boolean
    lastGridExtractAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    otpVerifications?: OTPVerificationUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    vehicles?: VehicleUncheckedCreateNestedManyWithoutUserInput
    locations?: LocationUncheckedCreateNestedManyWithoutUserInput
    routes?: RouteUncheckedCreateNestedManyWithoutUserInput
    places?: PlaceUncheckedCreateNestedManyWithoutUserInput
    placeReviews?: PlaceReviewUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutPlacePhotosInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutPlacePhotosInput, UserUncheckedCreateWithoutPlacePhotosInput>
  }

  export type PlaceUpsertWithoutPhotosInput = {
    update: XOR<PlaceUpdateWithoutPhotosInput, PlaceUncheckedUpdateWithoutPhotosInput>
    create: XOR<PlaceCreateWithoutPhotosInput, PlaceUncheckedCreateWithoutPhotosInput>
    where?: PlaceWhereInput
  }

  export type PlaceUpdateToOneWithWhereWithoutPhotosInput = {
    where?: PlaceWhereInput
    data: XOR<PlaceUpdateWithoutPhotosInput, PlaceUncheckedUpdateWithoutPhotosInput>
  }

  export type PlaceUpdateWithoutPhotosInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    placeNameEn?: NullableStringFieldUpdateOperationsInput | string | null
    placeNameLocal?: NullableStringFieldUpdateOperationsInput | string | null
    category?: StringFieldUpdateOperationsInput | string
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    zoomLevel?: FloatFieldUpdateOperationsInput | number
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    userEmail?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    approvalStatus?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    autoApproveAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    googlePlaceId?: NullableStringFieldUpdateOperationsInput | string | null
    googleType?: NullableStringFieldUpdateOperationsInput | string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vicinity?: NullableStringFieldUpdateOperationsInput | string | null
    fullAddress?: NullableStringFieldUpdateOperationsInput | string | null
    village?: NullableStringFieldUpdateOperationsInput | string | null
    taluk?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    pincode?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    website?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableFloatFieldUpdateOperationsInput | number | null
    reviewCount?: NullableIntFieldUpdateOperationsInput | number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutPlacesNestedInput
    reviews?: PlaceReviewUpdateManyWithoutPlaceNestedInput
  }

  export type PlaceUncheckedUpdateWithoutPhotosInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    placeNameEn?: NullableStringFieldUpdateOperationsInput | string | null
    placeNameLocal?: NullableStringFieldUpdateOperationsInput | string | null
    category?: StringFieldUpdateOperationsInput | string
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    zoomLevel?: FloatFieldUpdateOperationsInput | number
    userId?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    userEmail?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    approvalStatus?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    autoApproveAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    googlePlaceId?: NullableStringFieldUpdateOperationsInput | string | null
    googleType?: NullableStringFieldUpdateOperationsInput | string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vicinity?: NullableStringFieldUpdateOperationsInput | string | null
    fullAddress?: NullableStringFieldUpdateOperationsInput | string | null
    village?: NullableStringFieldUpdateOperationsInput | string | null
    taluk?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    pincode?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    website?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableFloatFieldUpdateOperationsInput | number | null
    reviewCount?: NullableIntFieldUpdateOperationsInput | number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reviews?: PlaceReviewUncheckedUpdateManyWithoutPlaceNestedInput
  }

  export type UserUpsertWithoutPlacePhotosInput = {
    update: XOR<UserUpdateWithoutPlacePhotosInput, UserUncheckedUpdateWithoutPlacePhotosInput>
    create: XOR<UserCreateWithoutPlacePhotosInput, UserUncheckedCreateWithoutPlacePhotosInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutPlacePhotosInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutPlacePhotosInput, UserUncheckedUpdateWithoutPlacePhotosInput>
  }

  export type UserUpdateWithoutPlacePhotosInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpVerifications?: OTPVerificationUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
    vehicles?: VehicleUpdateManyWithoutUserNestedInput
    locations?: LocationUpdateManyWithoutUserNestedInput
    routes?: RouteUpdateManyWithoutUserNestedInput
    places?: PlaceUpdateManyWithoutUserNestedInput
    placeReviews?: PlaceReviewUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutPlacePhotosInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: NullableStringFieldUpdateOperationsInput | string | null
    googleId?: NullableStringFieldUpdateOperationsInput | string | null
    picture?: NullableStringFieldUpdateOperationsInput | string | null
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    lastGridExtractAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpVerifications?: OTPVerificationUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    vehicles?: VehicleUncheckedUpdateManyWithoutUserNestedInput
    locations?: LocationUncheckedUpdateManyWithoutUserNestedInput
    routes?: RouteUncheckedUpdateManyWithoutUserNestedInput
    places?: PlaceUncheckedUpdateManyWithoutUserNestedInput
    placeReviews?: PlaceReviewUncheckedUpdateManyWithoutUserNestedInput
  }

  export type OTPVerificationCreateManyUserInput = {
    id?: string
    email: string
    otp: string
    type: string
    expiresAt: Date | string
    verified?: boolean
    createdAt?: Date | string
  }

  export type SessionCreateManyUserInput = {
    id?: string
    token: string
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type VehicleCreateManyUserInput = {
    id?: string
    name: string
    licensePlate?: string | null
    type: string
    status?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type LocationCreateManyUserInput = {
    id?: string
    vehicleId?: string | null
    latitude: number
    longitude: number
    accuracy?: number | null
    speed?: number | null
    heading?: number | null
    timestamp?: Date | string
  }

  export type RouteCreateManyUserInput = {
    id?: string
    vehicleId?: string | null
    name?: string | null
    startLat: number
    startLng: number
    endLat: number
    endLng: number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: number | null
    duration?: number | null
    polyline?: string | null
    status?: string
    startedAt?: Date | string | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PlaceCreateManyUserInput = {
    id?: string
    name: string
    placeNameEn?: string | null
    placeNameLocal?: string | null
    category: string
    latitude: number
    longitude: number
    zoomLevel?: number
    userName?: string | null
    userEmail?: string | null
    source?: string
    approvalStatus?: string
    approvedAt?: Date | string | null
    autoApproveAt?: Date | string | null
    googlePlaceId?: string | null
    googleType?: string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: string | null
    vicinity?: string | null
    fullAddress?: string | null
    village?: string | null
    taluk?: string | null
    district?: string | null
    state?: string | null
    country?: string | null
    pincode?: string | null
    phone?: string | null
    website?: string | null
    rating?: number | null
    reviewCount?: number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: string | null
    description?: string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PlaceReviewCreateManyUserInput = {
    id?: string
    placeId: string
    userName?: string | null
    rating: number
    comment?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PlacePhotoCreateManyUserInput = {
    id?: string
    placeId: string
    userName?: string | null
    dataUrl: string
    caption?: string | null
    createdAt?: Date | string
  }

  export type OTPVerificationUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    otp?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    verified?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OTPVerificationUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    otp?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    verified?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OTPVerificationUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    otp?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    verified?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    token?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VehicleUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    licensePlate?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    locations?: LocationUpdateManyWithoutVehicleNestedInput
    routes?: RouteUpdateManyWithoutVehicleNestedInput
  }

  export type VehicleUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    licensePlate?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    locations?: LocationUncheckedUpdateManyWithoutVehicleNestedInput
    routes?: RouteUncheckedUpdateManyWithoutVehicleNestedInput
  }

  export type VehicleUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    licensePlate?: NullableStringFieldUpdateOperationsInput | string | null
    type?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LocationUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    accuracy?: NullableFloatFieldUpdateOperationsInput | number | null
    speed?: NullableFloatFieldUpdateOperationsInput | number | null
    heading?: NullableFloatFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    vehicle?: VehicleUpdateOneWithoutLocationsNestedInput
  }

  export type LocationUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    vehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    accuracy?: NullableFloatFieldUpdateOperationsInput | number | null
    speed?: NullableFloatFieldUpdateOperationsInput | number | null
    heading?: NullableFloatFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LocationUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    vehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    accuracy?: NullableFloatFieldUpdateOperationsInput | number | null
    speed?: NullableFloatFieldUpdateOperationsInput | number | null
    heading?: NullableFloatFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RouteUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    startLat?: FloatFieldUpdateOperationsInput | number
    startLng?: FloatFieldUpdateOperationsInput | number
    endLat?: FloatFieldUpdateOperationsInput | number
    endLng?: FloatFieldUpdateOperationsInput | number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: NullableFloatFieldUpdateOperationsInput | number | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    polyline?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    vehicle?: VehicleUpdateOneWithoutRoutesNestedInput
  }

  export type RouteUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    vehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    name?: NullableStringFieldUpdateOperationsInput | string | null
    startLat?: FloatFieldUpdateOperationsInput | number
    startLng?: FloatFieldUpdateOperationsInput | number
    endLat?: FloatFieldUpdateOperationsInput | number
    endLng?: FloatFieldUpdateOperationsInput | number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: NullableFloatFieldUpdateOperationsInput | number | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    polyline?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RouteUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    vehicleId?: NullableStringFieldUpdateOperationsInput | string | null
    name?: NullableStringFieldUpdateOperationsInput | string | null
    startLat?: FloatFieldUpdateOperationsInput | number
    startLng?: FloatFieldUpdateOperationsInput | number
    endLat?: FloatFieldUpdateOperationsInput | number
    endLng?: FloatFieldUpdateOperationsInput | number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: NullableFloatFieldUpdateOperationsInput | number | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    polyline?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlaceUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    placeNameEn?: NullableStringFieldUpdateOperationsInput | string | null
    placeNameLocal?: NullableStringFieldUpdateOperationsInput | string | null
    category?: StringFieldUpdateOperationsInput | string
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    zoomLevel?: FloatFieldUpdateOperationsInput | number
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    userEmail?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    approvalStatus?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    autoApproveAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    googlePlaceId?: NullableStringFieldUpdateOperationsInput | string | null
    googleType?: NullableStringFieldUpdateOperationsInput | string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vicinity?: NullableStringFieldUpdateOperationsInput | string | null
    fullAddress?: NullableStringFieldUpdateOperationsInput | string | null
    village?: NullableStringFieldUpdateOperationsInput | string | null
    taluk?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    pincode?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    website?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableFloatFieldUpdateOperationsInput | number | null
    reviewCount?: NullableIntFieldUpdateOperationsInput | number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reviews?: PlaceReviewUpdateManyWithoutPlaceNestedInput
    photos?: PlacePhotoUpdateManyWithoutPlaceNestedInput
  }

  export type PlaceUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    placeNameEn?: NullableStringFieldUpdateOperationsInput | string | null
    placeNameLocal?: NullableStringFieldUpdateOperationsInput | string | null
    category?: StringFieldUpdateOperationsInput | string
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    zoomLevel?: FloatFieldUpdateOperationsInput | number
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    userEmail?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    approvalStatus?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    autoApproveAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    googlePlaceId?: NullableStringFieldUpdateOperationsInput | string | null
    googleType?: NullableStringFieldUpdateOperationsInput | string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vicinity?: NullableStringFieldUpdateOperationsInput | string | null
    fullAddress?: NullableStringFieldUpdateOperationsInput | string | null
    village?: NullableStringFieldUpdateOperationsInput | string | null
    taluk?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    pincode?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    website?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableFloatFieldUpdateOperationsInput | number | null
    reviewCount?: NullableIntFieldUpdateOperationsInput | number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    reviews?: PlaceReviewUncheckedUpdateManyWithoutPlaceNestedInput
    photos?: PlacePhotoUncheckedUpdateManyWithoutPlaceNestedInput
  }

  export type PlaceUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    placeNameEn?: NullableStringFieldUpdateOperationsInput | string | null
    placeNameLocal?: NullableStringFieldUpdateOperationsInput | string | null
    category?: StringFieldUpdateOperationsInput | string
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    zoomLevel?: FloatFieldUpdateOperationsInput | number
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    userEmail?: NullableStringFieldUpdateOperationsInput | string | null
    source?: StringFieldUpdateOperationsInput | string
    approvalStatus?: StringFieldUpdateOperationsInput | string
    approvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    autoApproveAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    googlePlaceId?: NullableStringFieldUpdateOperationsInput | string | null
    googleType?: NullableStringFieldUpdateOperationsInput | string | null
    googleTypes?: NullableJsonNullValueInput | InputJsonValue
    googleMapsUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vicinity?: NullableStringFieldUpdateOperationsInput | string | null
    fullAddress?: NullableStringFieldUpdateOperationsInput | string | null
    village?: NullableStringFieldUpdateOperationsInput | string | null
    taluk?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    state?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    pincode?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    website?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableFloatFieldUpdateOperationsInput | number | null
    reviewCount?: NullableIntFieldUpdateOperationsInput | number | null
    openingHours?: NullableJsonNullValueInput | InputJsonValue
    businessStatus?: NullableStringFieldUpdateOperationsInput | string | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    googleReviews?: NullableJsonNullValueInput | InputJsonValue
    nearbyPlaces?: NullableJsonNullValueInput | InputJsonValue
    googlePhotos?: NullableJsonNullValueInput | InputJsonValue
    mapRenderingConfig?: NullableJsonNullValueInput | InputJsonValue
    extractedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlaceReviewUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: IntFieldUpdateOperationsInput | number
    comment?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    place?: PlaceUpdateOneRequiredWithoutReviewsNestedInput
  }

  export type PlaceReviewUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    placeId?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: IntFieldUpdateOperationsInput | number
    comment?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlaceReviewUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    placeId?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: IntFieldUpdateOperationsInput | number
    comment?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlacePhotoUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    dataUrl?: StringFieldUpdateOperationsInput | string
    caption?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    place?: PlaceUpdateOneRequiredWithoutPhotosNestedInput
  }

  export type PlacePhotoUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    placeId?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    dataUrl?: StringFieldUpdateOperationsInput | string
    caption?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlacePhotoUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    placeId?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    dataUrl?: StringFieldUpdateOperationsInput | string
    caption?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LocationCreateManyVehicleInput = {
    id?: string
    userId?: string | null
    latitude: number
    longitude: number
    accuracy?: number | null
    speed?: number | null
    heading?: number | null
    timestamp?: Date | string
  }

  export type RouteCreateManyVehicleInput = {
    id?: string
    userId: string
    name?: string | null
    startLat: number
    startLng: number
    endLat: number
    endLng: number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: number | null
    duration?: number | null
    polyline?: string | null
    status?: string
    startedAt?: Date | string | null
    completedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type LocationUpdateWithoutVehicleInput = {
    id?: StringFieldUpdateOperationsInput | string
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    accuracy?: NullableFloatFieldUpdateOperationsInput | number | null
    speed?: NullableFloatFieldUpdateOperationsInput | number | null
    heading?: NullableFloatFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneWithoutLocationsNestedInput
  }

  export type LocationUncheckedUpdateWithoutVehicleInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    accuracy?: NullableFloatFieldUpdateOperationsInput | number | null
    speed?: NullableFloatFieldUpdateOperationsInput | number | null
    heading?: NullableFloatFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LocationUncheckedUpdateManyWithoutVehicleInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    latitude?: FloatFieldUpdateOperationsInput | number
    longitude?: FloatFieldUpdateOperationsInput | number
    accuracy?: NullableFloatFieldUpdateOperationsInput | number | null
    speed?: NullableFloatFieldUpdateOperationsInput | number | null
    heading?: NullableFloatFieldUpdateOperationsInput | number | null
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RouteUpdateWithoutVehicleInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    startLat?: FloatFieldUpdateOperationsInput | number
    startLng?: FloatFieldUpdateOperationsInput | number
    endLat?: FloatFieldUpdateOperationsInput | number
    endLng?: FloatFieldUpdateOperationsInput | number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: NullableFloatFieldUpdateOperationsInput | number | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    polyline?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutRoutesNestedInput
  }

  export type RouteUncheckedUpdateWithoutVehicleInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    startLat?: FloatFieldUpdateOperationsInput | number
    startLng?: FloatFieldUpdateOperationsInput | number
    endLat?: FloatFieldUpdateOperationsInput | number
    endLng?: FloatFieldUpdateOperationsInput | number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: NullableFloatFieldUpdateOperationsInput | number | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    polyline?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RouteUncheckedUpdateManyWithoutVehicleInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    startLat?: FloatFieldUpdateOperationsInput | number
    startLng?: FloatFieldUpdateOperationsInput | number
    endLat?: FloatFieldUpdateOperationsInput | number
    endLng?: FloatFieldUpdateOperationsInput | number
    waypoints?: NullableJsonNullValueInput | InputJsonValue
    distance?: NullableFloatFieldUpdateOperationsInput | number | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    polyline?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    startedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlaceReviewCreateManyPlaceInput = {
    id?: string
    userId: string
    userName?: string | null
    rating: number
    comment?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PlacePhotoCreateManyPlaceInput = {
    id?: string
    userId: string
    userName?: string | null
    dataUrl: string
    caption?: string | null
    createdAt?: Date | string
  }

  export type PlaceReviewUpdateWithoutPlaceInput = {
    id?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: IntFieldUpdateOperationsInput | number
    comment?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutPlaceReviewsNestedInput
  }

  export type PlaceReviewUncheckedUpdateWithoutPlaceInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: IntFieldUpdateOperationsInput | number
    comment?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlaceReviewUncheckedUpdateManyWithoutPlaceInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: IntFieldUpdateOperationsInput | number
    comment?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlacePhotoUpdateWithoutPlaceInput = {
    id?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    dataUrl?: StringFieldUpdateOperationsInput | string
    caption?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutPlacePhotosNestedInput
  }

  export type PlacePhotoUncheckedUpdateWithoutPlaceInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    dataUrl?: StringFieldUpdateOperationsInput | string
    caption?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlacePhotoUncheckedUpdateManyWithoutPlaceInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    userName?: NullableStringFieldUpdateOperationsInput | string | null
    dataUrl?: StringFieldUpdateOperationsInput | string
    caption?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use UserCountOutputTypeDefaultArgs instead
     */
    export type UserCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use VehicleCountOutputTypeDefaultArgs instead
     */
    export type VehicleCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = VehicleCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use PlaceCountOutputTypeDefaultArgs instead
     */
    export type PlaceCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = PlaceCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use UserDefaultArgs instead
     */
    export type UserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserDefaultArgs<ExtArgs>
    /**
     * @deprecated Use OTPVerificationDefaultArgs instead
     */
    export type OTPVerificationArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = OTPVerificationDefaultArgs<ExtArgs>
    /**
     * @deprecated Use SessionDefaultArgs instead
     */
    export type SessionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = SessionDefaultArgs<ExtArgs>
    /**
     * @deprecated Use VehicleDefaultArgs instead
     */
    export type VehicleArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = VehicleDefaultArgs<ExtArgs>
    /**
     * @deprecated Use LocationDefaultArgs instead
     */
    export type LocationArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = LocationDefaultArgs<ExtArgs>
    /**
     * @deprecated Use RouteDefaultArgs instead
     */
    export type RouteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = RouteDefaultArgs<ExtArgs>
    /**
     * @deprecated Use PlaceDefaultArgs instead
     */
    export type PlaceArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = PlaceDefaultArgs<ExtArgs>
    /**
     * @deprecated Use PlaceReviewDefaultArgs instead
     */
    export type PlaceReviewArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = PlaceReviewDefaultArgs<ExtArgs>
    /**
     * @deprecated Use PlacePhotoDefaultArgs instead
     */
    export type PlacePhotoArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = PlacePhotoDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}