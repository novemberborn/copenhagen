# Copenhagen

Experimental infrastructure for creating Istanbul-compatible code coverage.

## Background

[Istanbul] is a code coverage tool for JavaScript. It supports a wide range of
reporters and is used by tools like [`nyc`].

Unfortunately Istanbul isn't great with newer JavaScript syntax. Various
solutions exist which use source maps to convert coverage reports to the
original source. Inevitably these solutions encounter
[edge-cases](https://github.com/bcoe/nyc/issues/198) where the resulting report
is inaccurate or incomplete.

Istanbul modifies your code (known as *instrumenting*) in order to collect
coverage data. This can cause stack traces to be misaligned with your actual
code, making it harder to debug failing tests.

Coverage data is stored in a global variable. In Node.js this means special exit
handlers are required to persist the data to disk. Further, coverage data can't
be accessed without executing the instrumented code. If the code cannot run in a
particular environment this will cause a crash. ES2015 code must be transpiled
before it can be instrumented which [breaks `nyc`'s `--all` option when
combined](https://github.com/bcoe/nyc/issues/183) with [AVA] and custom
precompilers.

Loading the `istanbul` dependency can be slow. `nyc` has special lazy-loading
logic to work around this issue. Instrumenting can be slow as well, leading
`nyc` to implement a cache layer.

Copenhagen was created to address these issues.

It uses Babel plugins to add instrumentation, allowing new syntax to be
instrumented *before* code is transpiled to ES5. It can also statically generate
the initial coverage data so the instrumented code does not have to be executed.
These plugins can be used independently in a separate build pipeline.

Source maps can be generated for the instrumented code. These can be used to
correct stack traces.

Alternative compilers may be be written to support languages such as TypeScript
or CoffeeScript.

The default data collector is a singleton module. Tools like `nyc` can use this
module to get a stream for the collected data. This data can then be piped to
disk, alleviating the need for exit handlers.

The single export of the main `copenhagen` module is a `cacheSalt`, which can be
used to cache the instrumentation output. Other features are available through
individual modules, e.g. `copenhagen/instrument`. This makes it easier to lazy
load dependencies.

## Remaining work

Copenhagen is still new. I'd like to integrate it with `nyc`. The `cacheSalt`
implementation should be improved to work with local Git clones and npm-based
Git installs. This will help development. Much more syntax needs to be
supported, as well as Istanbul's ignore pragmas. There is a [`__coverage__`
Babel plugin](https://github.com/dtinth/babel-plugin-__coverage__) which may
contain some useful syntax.

[Istanbul]: https://github.com/gotwarlost/istanbul/
[`nyc`]: https://github.com/bcoe/nyc
[AVA]: https://github.com/sindresorhus/ava
