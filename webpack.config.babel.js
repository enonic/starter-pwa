import path from 'path';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { InjectManifest } from 'workbox-webpack-plugin';
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require("copy-webpack-plugin");

// const ENV = process.env.NODE_ENV || 'development'; // console.log(env);
//const ENV = 'production';
const ENV = 'development';
const SRC_DIR = 'src/main/resources';
const DST_DIR = 'build/resources/main';
const DST_ASSETS_DIR = path.join(__dirname, DST_DIR, 'assets');

const isProd = (ENV === 'production');

module.exports = {
    context: path.resolve(__dirname, SRC_DIR, 'assets'),
    entry: {
        'js/app': './js/app.js',
        'js/push': './js/push.js',
        'js/bs': './js/bs.js'
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
                    {loader: MiniCssExtractPlugin.loader, options: {publicPath: '../', hmr: !isProd}},
                    {loader: 'css-loader', options: {sourceMap: !isProd, importLoaders: 1}},
                    {loader: 'less-loader', options: {sourceMap: !isProd}},
                ]
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                use: [
                    'file-loader?name=images/[name].[ext]',
                ],
            },
            {
                test: /\.(eot|woff|woff2|ttf)$/,
                use: [{
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]',
                        outputPath: 'fonts/',
                        publicPath: '../../fonts/',
                    }
                }]
            },
        ]
    },
    output: {
        path: DST_ASSETS_DIR,
        filename: 'bundles/[name]-bundle.js',
        libraryTarget: 'var',
        library: ['Starter', '[name]']
    },
    plugins: [
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: path.join(DST_ASSETS_DIR, 'precache-manifest*.*')
        }),
        new MiniCssExtractPlugin({
            filename: 'bundles/css/main.css'
        }),
        new InjectManifest({
            swSrc: path.join(__dirname, SRC_DIR, 'templates/workbox-sw.js'),
            swDest: path.join(__dirname, DST_DIR, 'templates/sw.js')
        }),
        new CopyWebpackPlugin({
            patterns: [
                {from: 'images/**/*', to: '[path]/[name].[ext]'},
                {from: 'js/material.min.js', to: 'js/'},
            ]
        })
    ],
    resolve: {
        extensions: ['.js', '.less', '.css']
    }
};
