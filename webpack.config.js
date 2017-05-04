var webpack = require('webpack');
module.exports = {
	devtool: 'source-map',
	context: __dirname + '/src',
	entry: {
		'utilities': [ 'babel-polyfill', './index.js' ],
		'utilities-minimal':           [ './index.js' ]
	},
	output: {
		path: __dirname + '/dist',
		filename: '[name].js',
		library: 'Utilities',
		libraryTarget: 'umd',
		sourceMapFilename: '[file].map',
		/* source-map support for IntelliJ/WebStorm */
		devtoolModuleFilenameTemplate:         '[absolute-resource-path]',
		devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
	},
	module: {
		loaders: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				loader: 'babel-loader'
			},
			{
				test: /\.json$/,
				loader: 'json-loader'
			}
		]
	},
	plugins: [
		new webpack.optimize.OccurrenceOrderPlugin()
	]
};
