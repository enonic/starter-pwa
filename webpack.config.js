const path = require('path');
const extractTextPlugin = require('extract-text-webpack-plugin');
const workboxBuild = require('workbox-build');

const paths = {
    assets: 'src/main/resources/assets/',
    buildAssets: 'build/resources/main/assets/'
};

const assetsPath = path.join(__dirname, paths.assets);
const buildAssetsPath = path.join(__dirname, paths.buildAssets);

workboxBuild.injectManifest({
    swSrc: path.join(assetsPath, 'js/sw-dev.js'),
    swDest: path.join(buildAssetsPath, 'sw.js'),
    globDirectory: assetsPath,
    globPatterns: ['precache/**\/*'],
    globIgnores: ['precache/browserconfig.xml', 'precache/manifest.json']
});

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
        new extractTextPlugin('precache/bundle.css')
    ]

};