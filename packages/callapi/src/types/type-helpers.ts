// == These two types allows for adding arbitrary literal types, while still provided autocomplete for defaults.
// == Usually intersection with "{}" or "NonNullable<unknown>" would make it work fine, but the placeholder with never type is added to make the AnyWhatever type appear last in a given union.
export type AnyString = string & NonNullable<unknown>;
export type AnyNumber = number & NonNullable<unknown>;

// eslint-disable-next-line ts-eslint/no-explicit-any -- Any is fine here
export type AnyObject = Record<keyof any, any>;

// eslint-disable-next-line ts-eslint/no-explicit-any -- Any is required here so that one can pass custom function type without type errors
export type AnyFunction<TResult = unknown> = (...args: any[]) => TResult;

export type Prettify<TObject> = NonNullable<unknown> & { [Key in keyof TObject]: TObject[Key] };

export type WriteableLevel = "deep" | "shallow";

/**
 * Makes all properties in an object type writeable (removes readonly modifiers).
 * Supports both shallow and deep modes, and handles special cases like arrays, tuples, and unions.
 * @template TObject - The object type to make writeable
 * @template TVariant - The level of writeable transformation ("shallow" | "deep")
 */

type ArrayOrObject = Record<number | string | symbol, unknown> | unknown[];

export type Writeable<TObject, TLevel extends WriteableLevel = "shallow"> =
	TObject extends readonly [...infer TTupleItems] ?
		[
			...{
				[Index in keyof TTupleItems]: TLevel extends "deep" ? Writeable<TTupleItems[Index], "deep">
				:	TTupleItems[Index];
			},
		]
	: TObject extends ArrayOrObject ?
		{
			-readonly [Key in keyof TObject]: TLevel extends "deep" ? Writeable<TObject[Key], "deep">
			:	TObject[Key];
		}
	:	TObject;

export const defineEnum = <const TValue extends object>(value: TValue) =>
	Object.freeze(value) as Readonly<Writeable<TValue>>;

export type UnionToIntersection<TUnion> =
	(TUnion extends unknown ? (param: TUnion) => void : never) extends (param: infer TParam) => void ?
		TParam
	:	never;

// == Using this Immediately Indexed Mapped type helper to help show computed type of anything passed to it instead of just the type name
export type UnmaskType<TValue> = { _: TValue }["_"];

export type RemovePrefix<TPrefix extends "dedupe" | "retry", TKey extends string> =
	TKey extends `${TPrefix}${infer TRest}` ? Uncapitalize<TRest> : TKey;

export type Awaitable<TValue> = Promise<TValue> | TValue;

export type CommonRequestHeaders =
	| "Access-Control-Allow-Credentials"
	| "Access-Control-Allow-Headers"
	| "Access-Control-Allow-Methods"
	| "Access-Control-Allow-Origin"
	| "Access-Control-Expose-Headers"
	| "Access-Control-Max-Age"
	| "Age"
	| "Allow"
	| "Cache-Control"
	| "Clear-Site-Data"
	| "Content-Disposition"
	| "Content-Encoding"
	| "Content-Language"
	| "Content-Length"
	| "Content-Location"
	| "Content-Range"
	| "Content-Security-Policy-Report-Only"
	| "Content-Security-Policy"
	| "Cookie"
	| "Cross-Origin-Embedder-Policy"
	| "Cross-Origin-Opener-Policy"
	| "Cross-Origin-Resource-Policy"
	| "Date"
	| "ETag"
	| "Expires"
	| "Last-Modified"
	| "Location"
	| "Permissions-Policy"
	| "Pragma"
	| "Retry-After"
	| "Save-Data"
	| "Sec-CH-Prefers-Color-Scheme"
	| "Sec-CH-Prefers-Reduced-Motion"
	| "Sec-CH-UA-Arch"
	| "Sec-CH-UA-Bitness"
	| "Sec-CH-UA-Form-Factor"
	| "Sec-CH-UA-Full-Version-List"
	| "Sec-CH-UA-Full-Version"
	| "Sec-CH-UA-Mobile"
	| "Sec-CH-UA-Model"
	| "Sec-CH-UA-Platform-Version"
	| "Sec-CH-UA-Platform"
	| "Sec-CH-UA-WoW64"
	| "Sec-CH-UA"
	| "Sec-Fetch-Dest"
	| "Sec-Fetch-Mode"
	| "Sec-Fetch-Site"
	| "Sec-Fetch-User"
	| "Sec-GPC"
	| "Server-Timing"
	| "Server"
	| "Service-Worker-Navigation-Preload"
	| "Set-Cookie"
	| "Strict-Transport-Security"
	| "Timing-Allow-Origin"
	| "Trailer"
	| "Transfer-Encoding"
	| "Upgrade"
	| "Vary"
	| "Warning"
	| "WWW-Authenticate"
	| "X-Content-Type-Options"
	| "X-DNS-Prefetch-Control"
	| "X-Frame-Options"
	| "X-Permitted-Cross-Domain-Policies"
	| "X-Powered-By"
	| "X-Robots-Tag"
	| "X-XSS-Protection"
	| AnyString;

export type CommonAuthorizationHeaders = `${"Basic" | "Bearer" | "Token"} ${string}`;

export type CommonContentTypes =
	| "application/epub+zip"
	| "application/gzip"
	| "application/json"
	| "application/ld+json"
	| "application/octet-stream"
	| "application/ogg"
	| "application/pdf"
	| "application/rtf"
	| "application/vnd.ms-fontobject"
	| "application/wasm"
	| "application/xhtml+xml"
	| "application/xml"
	| "application/zip"
	| "audio/aac"
	| "audio/mpeg"
	| "audio/ogg"
	| "audio/opus"
	| "audio/webm"
	| "audio/x-midi"
	| "font/otf"
	| "font/ttf"
	| "font/woff"
	| "font/woff2"
	| "image/avif"
	| "image/bmp"
	| "image/gif"
	| "image/jpeg"
	| "image/png"
	| "image/svg+xml"
	| "image/tiff"
	| "image/webp"
	| "image/x-icon"
	| "model/gltf-binary"
	| "model/gltf+json"
	| "text/calendar"
	| "text/css"
	| "text/csv"
	| "text/html"
	| "text/javascript"
	| "text/plain"
	| "video/3gpp"
	| "video/3gpp2"
	| "video/av1"
	| "video/mp2t"
	| "video/mp4"
	| "video/mpeg"
	| "video/ogg"
	| "video/webm"
	| "video/x-msvideo"
	| AnyString;
