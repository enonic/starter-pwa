const path = require('path');
const extractTextPlugin = require('extract-text-webpack-plugin');
const workboxPlugin = require('workbox-webpack-plugin');

const paths = {
    assets: 'src/main/resources/assets/',
    buildAssets: 'build/resources/main/assets/',
    buildPwaLib: 'build/resources/main/lib/pwa/'
};

const assetsPath = path.join(__dirname, paths.assets);
const buildAssetsPath = path.join(__dirname, paths.buildAssets);
const buildPwaLibPath = path.join(__dirname, paths.buildPwaLib);

module.exports = {

    entry: path.join(assetsPath, 'js/main.js'),

    output: {
        path: buildAssetsPath,
        filename: 'precache/bundle.js'
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
            globIgnores: [],
            swSrc: path.join(assetsPath, 'js/sw-dev.js'),
            swDest: path.join(buildPwaLibPath, 'sw-template.js')
        })
    ]

};