import path from 'path';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { InjectManifest } from 'workbox-webpack-plugin';
const CleanWebpackPlugin = require('clean-webpack-plugin');

// const ENV = process.env.NODE_ENV || 'development'; // console.log(env);
const ENV = 'production';
const SRC_DIR = 'src/main/resources';
const DST_DIR = 'build/resources/main';
const DST_ASSETS_DIR = path.join(__dirname, DST_DIR, 'assets');

module.exports = {
    context: path.resolve(__dirname, SRC_DIR, 'assets/js'),
    entry: {
        app: './app.js',
        push: './push.js',
        bs: './bs.js'
    },
    mode: ENV,
    module: {
        rules: [
            {
                enforce: 'pre',
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'eslint-loader',
                options: {
                    failOnWarning: false,
                    failOnError: true
                }
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader'
            },
            {
                test: /.less$/,
                use: [
                    ENV === 'production'
                        ? MiniCssExtractPlugin.loader
                        : 'style-loader',
                    'css-loader',
                    'less-loader'
                ]
            }
        ]
    },
    output: {
        path: DST_ASSETS_DIR,
        filename: 'bundles/js/[name]-bundle.js',
        libraryTarget: 'var',
        library: ['Starter', '[name]']
    },
    plugins: [
        new CleanWebpackPlugin([path.join(DST_ASSETS_DIR, 'precache-manifest*.*')]),
        new MiniCssExtractPlugin({
            filename: 'bundles/css/main.css'
        }),
        new InjectManifest({
            globDirectory: DST_ASSETS_DIR,
            globPatterns: ['precache/**/*'],
            swSrc: path.join(__dirname, SRC_DIR, 'templates/workbox-sw.js'),
            swDest: path.join(__dirname, DST_DIR, 'templates/sw.js')
        })
    ],
    resolve: {
        extensions: ['.js', '.less']
    }
};
