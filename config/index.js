const path = require('path')

const config = {
  projectName: 'yue-miniprogram',
  date: '2026-9-14',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    375: 2,
    828: 1.81 / 2
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [],
  defineConstants: {},
  copy: {
    patterns: [],
    options: {}
  },
  framework: 'react',
  compiler: 'webpack5',
  cache: {
    enable: false
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {
          // 设计稿 375，与网页版一致，写 px 会按 2 倍换算成 rpx
          designWidth: 375
        }
      },
      cssModules: {
        enable: false
      }
    },
    // 小程序端资源体积配置：mp3 不转 base64，直接拷贝到 dist
    miniCssExtractPluginOption: {},
    webpackChain(chain) {
      chain.merge({
        module: {
          rule: {
            mediaFile: {
              test: /\.(mp3|m4a|aac|wav)$/,
              type: 'asset/resource',
              generator: {
                filename: 'assets/audio/[name][ext]'
              },
              parser: {
                dataUrlCondition: {
                  maxSize: 1024 * 1024 * 20
                }
              }
            }
          }
        }
      })
    },
    optimizeMainPackage: {
      enable: true
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    output: {
      filename: 'js/[name].[hash:8].js',
      chunkFilename: 'js/[name].[chunkhash:8].js'
    },
    miniCssExtractPluginOption: {
      ignoreOrder: true,
      filename: 'css/[name].[hash].css',
      chunkFilename: 'css/[name].[chunkhash].css'
    },
    postcss: {
      autoprefixer: { enable: true, config: {} },
      cssModules: { enable: false }
    }
  },
  alias: {
    '@': path.resolve(__dirname, '..', 'src')
  }
}

module.exports = function (merge) {
  if (process.env.NODE_ENV === 'development') {
    return merge({}, config, require('./dev'))
  }
  return merge({}, config, require('./prod'))
}
