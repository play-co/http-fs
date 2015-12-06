module.exports = {
  "rename": {
    "params": [
        {"name": "oldPath", "isPath": true},
        {"name": "newPath", "isPath": true}
    ]
  },
  "ftruncate": {
    "params": [
        {"name": "fd", "isPath": true},
        {"name": "len", "isPath": true}
    ]
  },
  "truncate": {
    "params": [
        {"name": "path", "isPath": true},
        {"name": "len"}
    ]
  },
  "chown": {
    "params": [
        {"name": "path", "isPath": true},
        {"name": "uid"},
        {"name": "gid"}
    ]
  },
  "fchown": {
    "params": [
        {"name": "fd", "isPath": true},
        {"name": "uid", "isPath": true},
        {"name": "gid", "isPath": true}
    ]
  },
  "lchown": {
    "params": [
        {"name": "path", "isPath": true},
        {"name": "uid"},
        {"name": "gid"}
    ]
  },
  "chmod": {
    "params": [
        {"name": "path", "isPath": true},
        {"name": "mode"}
    ]
  },
  "fchmod": {
    "params": [
        {"name": "fd", "isPath": true},
        {"name": "mode", "isPath": true}
    ]
  },
  "lchmod": {
    "params": [
        {"name": "path", "isPath": true},
        {"name": "mode"}
    ]
  },
  "stat": {
    "params": [
        {"name": "path", "isPath": true}
    ],
    "returns": "fs.Stat"
  },
  "lstat": {
    "params": [
        {"name": "path", "isPath": true}
    ],
    "returns": "fs.Stat"
  },
  "fstat": {
    "params": [
      {"name": "fd", "isPath": true}
    ],
    "returns": "fs.Stat"
  },
  "link": {
    "params": [
      {"name": "srcpath", "isPath": true},
      {"name": "dstpath", "isPath": true}
    ]
  },
  "symlink": {
    "params": [
      {"name": "destination", "isPath": true},
      {"name": "path", "isPath": true},
      {"name": "type", "optional": true}
    ]
  },
  "readlink": {
    "params": [
      {"name": "path", "isPath": true}
    ]
  },
  "realpath": {
    "params": [
      {"name": "path", "isPath": true},
      {"name": "cache", "optional": true}
    ]
  },
  "unlink": {
    "params": [
      {"name": "path", "isPath": true}
    ]
  },
  "rmdir": {
    "params": [
      {"name": "path", "isPath": true}
    ]
  },
  "mkdir": {
    "params": [
      {"name": "path", "isPath": true},
      {"name": "mode", "optional": true}
    ]
  },
  "readdir": {
    "params": [
      {"name": "path", "isPath": true}
    ]
  },
  "close": {
    "params": [
      {"name": "fd", "isPath": true}
    ]
  },
  "open": {
    "params": [
      {"name": "path", "isPath": true},
      {"name": "flags"},
      {"name": "mode", "optional": true}
    ]
  },
  "utimes": {
    "params": [
      {"name": "path", "isPath": true},
      {"name": "atime"},
      {"name": "mtime"}
    ]
  },
  "futimes": {
    "params": [
      {"name": "fd", "isPath": true},
      {"name": "atime", "isPath": true},
      {"name": "mtime", "isPath": true}
    ]
  },
  "fsync": {
    "params": [
      {"name": "fd", "isPath": true}
    ]
  },
  // 'write': {params: ['fd', 'buffer', 'offset', 'length'], optional: ['position']},
  "write": {
    "params":[
      {"name": "fd", "isPath": true},
      {"name": "data", "isData": true},
      {"name": "position", "optional": true},
      {"name": "encoding", "optional": true}
    ]
  },
  "read": {
    "params":[
      {"name": "fd", "isPath": true},
      {"name": "buffer", "isPath": true},
      {"name": "offset", "isPath": true},
      {"name": "length", "isPath": true},
      {"name": "position", "isPath": true}
    ]
  },
  "readFile": {
    "params":[
      {"name": "filename", "isPath": true},
      {"name": "options", "optional": true}
    ]
  },
  "writeFile": {
    "params":[
      {"name": "filename", "isPath": true},
      {"name": "data", "isData": true},
      {"name": "options", "optional": true}
    ]
  },
  "appendFile": {
    "params":[
      {"name": "filename", "isPath": true},
      {"name": "data", "isData": true},
      {"name": "options", "optional": true}
    ]
  },
  // 'watchFile': {params: ['filename'], optional: ['options']},
  // 'unwatchFile': {params: ['filename'], optional: ['options']},
  // 'watch': {params: ['filename'[,' options'][, listener]]},
  "exists": {
    "params":[
      {"name": "path", "isPath": true}
    ]
  },
  "access": {
    "params":[
      {"name": "path", "isPath": true},
      {"name": "mode", "optional": true}
    ]
  },
  "glob": {
    "params":[
      {"name": "glob"},
      {"name": "options", "optional": true, "isObject": true}
    ]
  }
};

