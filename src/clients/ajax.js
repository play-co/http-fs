import { Promise, TimeoutError } from 'bluebird';

export function get(url, opts) {
  let request = new Request(url, opts);
  if (_inflight >= exports.MAX_SIMULTANEOUS) {
    _pending.push(request);
  } else {
    _send(request);
  }

  return request.onFinish;
}

export function post(url, opts) {
  if (!opts) { opts = {}; }
  opts.method = 'POST';
  return exports.get(url, opts);
}

export function dataToPairs(data) {
  let pairs;
  if (Array.isArray(data)) {
    pairs = data;
  } else {
    pairs = [];
    for (let key in data) {
      pairs.push([key, data[key]]);
    }
  }
  return pairs;
}

export function formURLEncoded(data) {
  return encodeDataToURI(data)
    .replace(/%20/g, '+');
}

export function toFormData(data) {
  var formData = new FormData();
  dataToPairs(data).forEach(([key, value]) => {
    // FormData.append will encode string values (e.g. replacing \n with \r\n),
    // which we don't want. Use a Blob to guarantee byte-accuracy when uploading
    // string content.
    let rawValue = typeof value == 'string'
      ? new Blob([value], {type: 'text/plain; charset=UTF-8'})
      : value;

    formData.append(key, rawValue);
  });
  return formData;
}

export function encodeDataToURI(kvp) {
  return dataToPairs(kvp).map(([key, value]) =>
      encodeURIComponent(key) + '=' + encodeURIComponent(value))
    .join('&');
}

export function parseURIComponents(str) {
  let pairs = str.split('&');
  let n = pairs.length;
  let data = [];
  for (let i = 0; i < n; ++i) {
    if (!pairs[i]) { continue; }
    let pair = pairs[i].split('=');
    data.push([decodeURIComponent(pair[0]), decodeURIComponent(pair[1])]);
  }

  return data;
}

function addToSearch(urlStr, data) {
  let url = new URL(urlStr);
  let search = parseURIComponents(url.search.substring(1));
  for (var key in data) {
    search.push([key, data[key]]);
  }

  url.search = '?' + encodeDataToURI(search);
  return url.toString();
}

export let MAX_SIMULTANEOUS = 4;

var _inflight = 0;
var _UID = 0;

class Request {

  constructor(url, opts) {
    if (!opts) { opts = {}; }

    this.method = (opts.method || 'GET').toUpperCase();
    this.url = url;
    this.type = opts.type;
    this.async = opts.async !== false;
    this.timeout = opts.timeout;
    this.withCredentials = !!opts.withCredentials;
    this.id = ++_UID;
    this.headers = {};

    this.onFinish = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });

    if (opts.headers) {
      for (var key in opts.headers) if (opts.headers.hasOwnProperty(key)) {
        var value = opts.headers[key];
        if (key.toLowerCase() == 'content-type') {
          key = 'Content-Type';
          this.contentType = value;
        }

        this.headers[key] = value;
      }
    }

    var isObject = opts.data && typeof opts.data == 'object';

    if (this.method == 'GET' && opts.data) {
      this.url = addToSearch(this.url, opts.data);
    }

    if (opts.query) {
      this.url = addToSearch(this.url, opts.query);
    }

    if (this.method !== 'GET') {
      if (isObject && !(opts.data instanceof FormData)) {
        if (this.contentType === 'application/x-www-form-urlencoded') {
          this.data = formURLEncoded(opts.data);
        } else if (!this.contentType || this.contentType === 'multipart/form-data') {
          this.data = toFormData(opts.data);
        }
      } else {
        this.data = opts.data;
      }

      if (this.data instanceof FormData) {
        // using FormData auto-inserts the correct Content-Type with boundary
        delete this.headers['Content-Type'];
      }
    } else if (this.contentType == 'application/json') {
      try {
        this.data = isObject ? JSON.stringify(opts.data) : opts.data;
      } catch (e) {
        this.reject(e);
      }
    }
  }
}

var _pending = [];

function _sendNext() {
  //logger.log('====INFLIGHT', _inflight, exports.MAX_SIMULTANEOUS, 'might send next?');
  if (_inflight < exports.MAX_SIMULTANEOUS) {
    var request = _pending.shift();
    if (request) {
      _send(request);
    }
  }
}

function _send(request) {
  ++_inflight;

  var xhr = new XMLHttpRequest();
  xhr.open(request.method, request.url, request.async !== false);
  var setContentType = false;
  for (var key in request.headers) {
    if (key.toLowerCase() == 'content-type') { setContentType = true; }
    xhr.setRequestHeader(key, request.headers[key]);
  }

  xhr.withCredentials = request.withCredentials;

  if (!setContentType && request.contentType) {
    xhr.setRequestHeader('Content-Type', request.contentType);
  }

  xhr.onreadystatechange = () => {
    if (xhr.readyState != 4) { return; }

    --_inflight;

    setTimeout(_sendNext, 0);

    var isJSON = /^application\/json(;|$)/.test(xhr.getResponseHeader('Content-Type')) || request.type == 'json';
    var response = xhr.response || xhr.responseText;
    var data = response;
    var parseError = false;
    if (isJSON && response && typeof response == 'string') {
      try {
        data = JSON.parse(response);
      } catch(e) {
        parseError = true;
      }
    }

    // .status will be 0 when requests are filled via app cache on at least iOS 4.x
    if (xhr.status != 200 && xhr.status !== 0 || parseError) {
      request.reject({
        status: xhr.status,
        response: data,
        parseError: parseError,
        headers: xhr.getAllResponseHeaders()
      });
    } else {
      request.resolve({
        data: data,
        headers: xhr.getAllResponseHeaders()
      });
    }
  };

  if (request.timeout) {
    request.onFinish
      .timeout(request.timeout)
      .catch(TimeoutError, (e) => {
        --_inflight;

        xhr.onreadystatechange = null;
        request.timedOut = e;

        var headers;
        if (xhr.readyState >= xhr.HEADERS_RECEIVED) {
          try {
            headers = xhr.getAllResponseHeaders();
          } catch (e) {}
        }

        request.reject(e, null, headers);
      });
  }

  request.ts = +new Date();
  xhr.send(request.data || null);
}
