const path = require('path');
const extractTextPlugin = require('extract-text-webpack-plugin');
const workboxPlugin = require('workbox-webpack-plugin');

const paths = {
    templates: 'src/main/resources/templates/',
    assets: 'src/main/resources/assets/',
    buildAssets: 'build/resources/main/assets/',
    buildTemplates: 'build/resources/main/templates/'
};

const templatesPath = path.join(__dirname, paths.templates);
const assetsPath = path.join(__dirname, paths.assets);
const buildAssetsPath = path.join(__dirname, paths.buildAssets);
const buildTemplatesPath = path.join(__dirname, paths.buildTemplates);

module.exports = {

    entry: path.join(assetsPath, 'js/app.js'),

    output: {
        path: buildAssetsPath,
        filename: 'precache/bundle.js',
        libraryTarget: 'var',
        library: 'Starter'
    },

    resolve: {
        extensions: ['.js', '.less']
    },

    module: {
        rules: [
            {
                test: /.less$/,
                loader: extractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: "css-loader!less-loader"
                })
            }
        ]
    },
    plugins: [
        new extractTextPlugin('precache/bundle.css'),
        new workboxPlugin({
            globDirectory: buildAssetsPath,
            globPatterns: ['precache/**\/*'],
            swSrc: path.join(templatesPath, 'workbox-sw.js'),
            swDest: path.join(buildTemplatesPath, 'sw.js')
        })
    ]

};
