import { version as cacheSalt } from './package.json'

export { cacheSalt }

// TODO: When copenhagen is installed and linked during development it would be
// useful if the cacheSalt was a commit ref instead. Try to synchronously
// resolve .git/HEAD from .git/refs or .git/packed-refs. This should be a
// separate package.
//
// Similarly if copenhagen is installed from a GitHub URL try to resolve a
// useful cache key from the package.json. npm will have added properties, the
// following could be interesting:
//
// * _shasum
// * dist.shasum (same as _shasum, possibly more legit)
// * gitHead
