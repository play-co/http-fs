import {post} from './ajax';

let _mountMethodCache = {};
function getMethods(mountPoint) {
  if (!_mountMethodCache[mountPoint]) {
    _mountMethodCache[mountPoint] = post(`${mountPoint}/_methods`)
      .then(({data: methods}) => methods);
  }

  return _mountMethodCache[mountPoint];
}

class FileSystemAPI {

}

function base64toBlob(base64Data, contentType) {
  contentType = contentType || '';
  var sliceSize = 1024;
  var byteCharacters = atob(base64Data);
  var bytesLength = byteCharacters.length;
  var slicesCount = Math.ceil(bytesLength / sliceSize);
  var byteArrays = new Array(slicesCount);

  for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
    var begin = sliceIndex * sliceSize;
    var end = Math.min(begin + sliceSize, bytesLength);

    var bytes = new Array(end - begin);
    for (var offset = begin, i = 0 ; offset < end; ++i, ++offset) {
        bytes[i] = byteCharacters[offset].charCodeAt(0);
    }
    byteArrays[sliceIndex] = new Uint8Array(bytes);
  }

  return new Blob(byteArrays, {type: contentType});
}

export default function remoteFs(mountPoint, opts) {
  if (mountPoint instanceof FileSystemAPI) {
    mountPoint = mountPoint.MOUNT_POINT;
  }

  // remove trailing slashes
  mountPoint = mountPoint.replace(/[\\\/]+$/, '');

  let fs = new FileSystemAPI();
  let cwd = opts && opts.cwd || '/';
  if (cwd[cwd.length - 1] !== '/') { cwd += '/'; }

  let _constants;
  function getConstants() {
    if (!_constants) {
      _constants = post(`${mountPoint}/_constants`)
        .then(({data}) => {
          if (data) {
            return data;
          } else {
            throw new Error('fs-err: no fs constants available');
          }
        });
    }

    return _constants;
  }

  function addMethod(name, {params, returns}) {
    fs[name] = function () {
      let data = {};
      let index = 0;
      for (let i = 0, n = params.length; i < n; ++i) {
        let param = params[i];
        if (typeof arguments[index] === 'function') {
          if (!param.optional) { console.warn('not enough parameters to fs.' + name); }
          break;
        }

        if (!param.optional || arguments[index] !== undefined) {
          let value = arguments[index++];
          if (param.isPath && value[0] !== '/') {
            value = cwd + value;
          }

          if (param.isData) {
            if (String(value) === '[object HTMLImageElement]' && value.src && /^data\:/.test(value.src)) {
              let [, contentType, data] = value.src.match(/^data:(image\/.*?);base64,(.+)$/);
              value = base64toBlob(data, contentType);
            }
          }
          else if (param.isObject) {
            value = JSON.stringify(value);
          }

          data[param.name] = value;
        }
      }

      let cb = arguments[index];
      if (typeof cb !== 'function') {
        cb = null;
      }

      let res = post(`${mountPoint}/${name}`, {data: data})
        .then(({data}) => {
          if (data) {
            let {err, res} = data;
            if (err) {
              throw err;
            } else {
              return res;
            }
          }
        });

      if (returns === 'fs.Stat') {
        let constants = getConstants();
        res = res
          .then(data => constants
            .then(constants => new Stats(data, constants)));
      }

      return res.nodeify(cb);
    };
  }

  fs.walk = walk.bind(this, fs);
  fs.MOUNT_POINT = mountPoint;
  fs.CWD = cwd;

  return getMethods(mountPoint)
    .then(methods => {
      Object.keys(methods).forEach(name => addMethod(name, methods[name]));
      return fs;
    });
}

/**
 * dir: path to the directory to explore
 * action(file, stat): called on each file or until an error occurs. file: path to the file. stat: stat of the file (retrived by fs.stat)
 * done(err): called one time when the process is complete. err is undifined is everything was ok. the error that stopped the process otherwise
 */
export function walk(fs, dir, action, cb) {
  if (dir[dir.length - 1] !== '/') { dir += '/'; }

  let res = [];
  let readDir = dir => fs.readdir(dir)
    .then(list => {
      return list.map(file => {
        let path = dir + file;
        return fs.stat(path)
          .then(stat => {
            if (stat && stat.isDirectory()) {
              return readDir(path + '/');
            } else if (!/^\./.test(file)) {
              return action
                && Promise.resolve(action(path, stat))
                  .then(val => res.push(val))
                || res.push(path);
            }
          });
      });
    })
    .all();

  return fs.stat(dir)
    .then(stat => stat && stat.isDirectory() && readDir(dir))
    .then(() => res)
    .nodeify(cb);
}

export class Stats {
  constructor(data, constants) {
    this.constants = constants;

    this.dev = data.dev;
    this.mode = data.mode;
    this.nlink = data.nlink;
    this.uid = data.uid;
    this.gid = data.gid;
    this.rdev = data.rdev;
    this.blksize = data.blksize;
    this.ino = data.ino;
    this.size = data.size;
    this.blocks = data.blocks;
    this.atime = new Date(data.atim_msec);
    this.mtime = new Date(data.mtim_msec);
    this.ctime = new Date(data.ctim_msec);
    this.birthtime = new Date(data.birthtim_msec);
  }

  _checkModeProperty(property) {
    return ((this.mode & this.constants.S_IFMT) === property);
  }

  isDirectory() {
    return this._checkModeProperty(this.constants.S_IFDIR);
  }

  isFile() {
    return this._checkModeProperty(this.constants.S_IFREG);
  }

  isBlockDevice() {
    return this._checkModeProperty(this.constants.S_IFBLK);
  }

  isCharacterDevice() {
    return this._checkModeProperty(this.constants.S_IFCHR);
  }

  isSymbolicLink() {
    return this._checkModeProperty(this.constants.S_IFLNK);
  }

  isFIFO() {
    return this._checkModeProperty(this.constants.S_IFIFO);
  }

  isSocket() {
    return this._checkModeProperty(this.constants.S_IFSOCK);
  }
}
