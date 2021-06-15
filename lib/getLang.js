
const fs = require('fs')
const path = require('path')
const os = require('os')
const filePath = path.resolve('./src')
const readline = require('readline')
let test = /[\u4E00-\u9FA5\uF900-\uFA2D]+[\u4E00-\u9FA5\uF900-\uFA2D\uff01\uff08-\uff1f\u3001-\u3015\u0020a-zA-Z\d\\\/+*/-]*/
let rl = null
let lang = {}
let isNote = false
let dirU = os.type().toLowerCase().includes('window') ? '\\' : '/' // window环境使用‘\\’mac系统使用‘/’

function getFileList(dir, pages, filesList = [], ignoredir) {
  const files = fs.readdirSync(dir)
    files.forEach((item, index) => {
    if(ignoredir && ignoredir.includes(item)) return
    let fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      return getFileList(fullPath, pages, filesList, ignoredir) // 递归读取文件
    } else {
      filesList.push(fullPath)
    }
  })
  return filesList
}
function readFileList (dir, pages, ignoredir, mysrc) {
  // return new Promise((resolve, reject) => {
    let filesList = []
    let ps = []
    getFileList(dir, pages, filesList, ignoredir)
    filesList.forEach((fullPath) => {
      let p = null
      let path2 = fullPath.replace(process.cwd() + dirU + mysrc + dirU, '')
      if (pages.some(pagedir => path2.includes(pagedir))) {
        let path3 = path2
        pages.some(pagedir => {
          if(path2.includes(pagedir)){
            path2 = path2.replace(pagedir + dirU, '')
            return true
          }
          return false
        })
        let extname = path.extname(fullPath)
        if (['.vue', '.js'].includes(extname)) {
          path3 = path3.substring(0, path3.length - extname.length)
          if (path3.startsWith('components/')) {
            path3 = path3.substring('components/'.length, path3.length)
          }
          let pathNames = path3.split(dirU)
          let mylang = lang
          pathNames.forEach((v, i) => {
            const n = v.split(/(?=[A-Z])/).join('_').toLowerCase()
            if (!mylang[n]) {
              mylang[n] = (i === pathNames.length - 1) ? [] : {}
            }
            mylang = mylang[n]
          })
          p = new Promise((resolve,reject) => {
            console.log('Paring file:' + fullPath)
            isNote = false
            rl = readline.createInterface({
              input: fs.createReadStream(fullPath)
            })
            let lineIndex = 0
            rl.on('line', (line) => {
              lineIndex ++
              let content = isNote ? '' : line
              if (line.includes('/*')) {
                isNote = true
                content = line.slice(0, line.indexOf('/*'))
              }
              if (line.includes('*/')) {
                if (isNote) {
                  isNote = false
                  content = line.slice(line.indexOf('*/') + 2)
                }
              }
              if (line.includes('<!--')) {
                isNote = true
                content = line.slice(0, line.indexOf('<!--'))
              }
              if (line.includes('-->')) {
                if (isNote) {
                  isNote = false
                  content = line.slice(line.indexOf('-->') + 3)
                }
              }
              if (isNote && !content) return
              if (line.includes('//')) content = line.slice(0, line.indexOf('//'))

              let str = content.match(test)
              while (str) {
                if (str) {
                  str = str[0]
                  let otherStr = ''
                  if (content.indexOf('\'' + str) > -1) {
                    let contentArr = content.split(str)
                    otherStr = contentArr[1] ? contentArr[1].slice(0, contentArr[1].indexOf('\'')) : ''
                  }
                  if (content.indexOf('"' + str) > -1) {
                    let contentArr = content.split(str)
                    otherStr = contentArr[1] ? contentArr[1].slice(0, contentArr[1].indexOf('"')) : ''
                  }

                  if (content.indexOf('>' + str) > -1) {
                    let contentArr = content.split(str)
                    otherStr = contentArr[1] ? contentArr[1].slice(0, contentArr[1].indexOf('<')) : ''
                  }
                  if (content.indexOf(str + '"') > -1) {
                    let contentArr = content.split(str)
                    let reverseStr = contentArr[0].split("").reverse()
                    str = reverseStr.splice(0, reverseStr.indexOf('"')).reverse().join("") + str
                  } else {
                    str += otherStr // .replace(/{{(.*)}}/g, '')
                  }
                  mylang.push(str)
                  // if (lang[key]) {
                  //   lang[key].push(str)
                  // } else {
                  //   lang[key] = [str]
                  // }
                }
                content = content.slice(0, content.indexOf(str)) + content.slice(content.indexOf(str) + str.length)
                str = content.match(test)
              }
            })
            rl.on('close', () => {
              resolve(lang)
            })
          })
          ps.push(p)
        }
      }
    })
    return Promise.all(ps)
  // })
}

function inputLangs (fileName) {
  let item

  let cs_Lang = {
    __common: {}
  }

  const getAllObj = (allObj, lang) => {
    for (item in lang) {
      let arr = lang[item]
      if (Array.isArray(arr)) {
        for (let val of arr) {
          if (allObj[val]) {
            allObj[val] = 2
          } else {
            allObj[val] = 1
          }
        }
      } else if (typeof arr === 'object' && arr !== null) {
        getAllObj(allObj, arr)
      }
    }
  }

  let allObj = {}
  getAllObj(allObj, lang)
  // for (item in lang) {
  //   let arr = lang[item]
  //   for (let val of arr) {
  //     if (allObj[val]) {
  //       allObj[val] = 2
  //     } else {
  //       allObj[val] = 1
  //     }
  //   }
  // }
  let otherObjs = {}

  // 提取公共
  let count = 0
  for (let val in allObj) {
    if (allObj[val] === 2) {
      cs_Lang['__common']['cs_' + count] = val
      otherObjs[val] = true
      count++
    }
  }
  // console.log(lang)

  const parseLang = (cs_Lang, lang, otherObjs) => {
    let count = 0
    let total = 0
    for (item in lang) {
      let arr = lang[item]
      if (Array.isArray(arr)) {
        if (arr.length > 0) {
          const child_obj = cs_Lang[`${item}`] ? cs_Lang[`${item}`] : {}
          // if(!cs_Lang[`${item}`]){
          //   count = 0
          //   cs_Lang[`${item}`] = {}
          // } else {
          //   count = cs_Lang[`${item}`].length
          // }
          count = Object.keys(child_obj).length
          for (let val of arr) {
            if (!otherObjs[val]) {
              child_obj['cs_' + count] = val
              count++
              total++;
            }
          }
          if (Object.keys(child_obj).length > 0) {
            cs_Lang[`${item}`] = child_obj
          }
        }
      } else if (typeof arr === 'object' && arr !== null) {
        const child_name = item
        let child_lang = cs_Lang[child_name] ? cs_Lang[child_name] : {}
        const t = parseLang(child_lang, arr, otherObjs)
        total += t
        if (t > 0) {
          cs_Lang[child_name] = child_lang
        }
      }
    }
    return total
  }
  parseLang(cs_Lang, lang, otherObjs)

  // for (item in lang) {
  //   let arr = lang[item]
  //   if(!cs_Lang[`${item}`]){
  //     count = 0
  //     cs_Lang[`${item}`] = {}
  //   } else {
  //     count = cs_Lang[`${item}`].length
  //   }
  //   for (let val of arr) {
  //     if (!otherObjs[val]) {
  //       count++
  //       cs_Lang[`${item}`]['cs_' + count] = val
  //     } else {
  //     }
  //   }
  // }
  console.log('----------------------------------------------------\n')

// console.log(cs_Lang)
  let str = JSON.stringify(cs_Lang)//.replace(/\"/g, '\'')

  fs.writeFile(fileName, str, function (error) {
    if (error) {
      console.log(error)
    } else {
      console.log('collect lang finish!')
    }
  })
}

module.exports.getLang = (src = 'src', pages = ['pages', 'components'], fileName = 'zh_cn.json', ignoredir) => {
  readFileList(path.join(process.cwd(), src), pages, ignoredir, src).then(res => {
    inputLangs(fileName)
  }).catch(err => {
    console.log(err)
  })
}
