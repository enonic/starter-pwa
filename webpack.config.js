const path = require('path');
const extractTextPlugin = require('extract-text-webpack-plugin');
const {InjectManifest} = require('workbox-webpack-plugin');

const paths = {
    templates: 'src/main/resources/templates/',
    assets: 'src/main/resources/assets/',
    buildAssets: 'build/resources/main/assets/',
    buildTemplates: 'build/resources/main/templates' 
};

const templatesPath = path.join(__dirname, paths.templates);
const assetsPath = path.join(__dirname, paths.assets, 'js');
const buildAssetsPath = path.join(__dirname, paths.buildAssets);
const buildTemplatesPath = path.join(__dirname, paths.buildTemplates);

module.exports = {
    entry: {
        app: path.join(assetsPath, 'app.js'),
        push: path.join(assetsPath, 'push.js'),
        bs: path.join(assetsPath, 'bs.js')
    },

    output: {
        path: buildAssetsPath,
        filename: 'bundles/js/[name]-bundle.js',
        libraryTarget: 'var',
        library: ['Starter', '[name]']
    },

    resolve: {
        extensions: ['.js', '.less']
    },

    module: {

        rules: [
            {
                enforce: "pre",
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "eslint-loader",
                options: {
                    failOnWarning: false,
                    failOnError: true
                }
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "babel-loader",
            },
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
        new extractTextPlugin('bundles/css/main.css'),
        new InjectManifest({
            globDirectory: buildAssetsPath,
            globPatterns: ['precache/**\/*'],
            swSrc: path.join(templatesPath, 'workbox-sw.js'),
            swDest: path.join(buildTemplatesPath, 'sw.js')
        })
    ]
};
