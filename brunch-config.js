// See http://brunch.io for documentation.
exports.files = {
  javascripts: {joinTo: 'app.js'},
  stylesheets: {joinTo: 'app.css'}
};

exports.plugins = {
  babel: {presets: ['latest']},
  raw: {
    pattern: /\.(html|vert|frag|svg|txt)$/,
    wrapper: content => `module.exports = ${JSON.stringify(content)}`
  }
};

exports.watcher = {
    awaitWriteFinish: true,
    usePolling: true
}

exports.sourceMaps = 'inline';
