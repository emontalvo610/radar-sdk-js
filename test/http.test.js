const { expect } = require('chai');
const sinon = require('sinon');

import * as Cookie from '../src/cookie';
import SDK_VERSION from '../src/version';
import STATUS from '../src/status_codes';

import * as Http from '../src/http';

describe('http', () => {
  let getCookieStub;

  const publishableKey = 'mock-publishable-key';

  describe('request PUT', () => {

    let request;
    let httpCallback;

    beforeEach(() => {
      global.XMLHttpRequest = sinon.useFakeXMLHttpRequest();

      global.XMLHttpRequest.onCreate = (xhrRequest) => {
        request = xhrRequest;
      };

      getCookieStub = sinon.stub(Cookie, 'getCookie');
      getCookieStub.withArgs(Cookie.PUBLISHABLE_KEY).returns(publishableKey);

      httpCallback = sinon.spy();

      Http.request('PUT', 'https://api.radar.io/v1/users/userId', {}, null, httpCallback);
    });

    afterEach(() => {
      Cookie.getCookie.restore();

      global.XMLHttpRequest.restore();
    });

    context('success', () => {
      it('should call callback with api response', () => {
        expect(request).to.not.be.null;
        request.respond(200, {}, '{ success: "true" }');

        expect(httpCallback).to.have.been.calledWith(STATUS.SUCCESS, '{ success: "true" }');
      });
    });

    context('unauthorized', () => {
      it('should respond with unauthorized status', () => {
        expect(request).to.not.be.null;
        request.respond(401);

        expect(httpCallback).to.have.been.calledWith(STATUS.ERROR_UNAUTHORIZED);
      });
    });

    context('rate limit error', () => {
      it('should respond with rate limit error status', () => {
        expect(request).to.not.be.null;
        request.respond(429);

        expect(httpCallback).to.have.been.calledWith(STATUS.ERROR_RATE_LIMIT);
      });
    });

    context('server error', () => {
      it('should respond with server error status', () => {
        expect(request).to.not.be.null;
        request.respond(500);

        expect(httpCallback).to.have.been.calledWith(STATUS.ERROR_SERVER);
      });
    });

    context('error', () => {
      it('should respond with server error status', () => {
        expect(request).to.not.be.null;
        request.onerror();

        expect(httpCallback).to.have.been.calledWith(STATUS.ERROR_SERVER);
      });
    });

    context('timeout', () => {
      it('should respond with network error status', () => {
        expect(request).to.not.be.null;
        request.timeout();

        expect(httpCallback).to.have.been.calledWith(STATUS.ERROR_NETWORK);
      });
    });
  });

  describe('request GET', () => {

    let request;
    let httpCallback;

    let data;
    let getResponse;

    beforeEach(() => {
      global.XMLHttpRequest = sinon.useFakeXMLHttpRequest();

      global.XMLHttpRequest.onCreate = (xhrRequest) => {
        request = xhrRequest;
      };

      getCookieStub = sinon.stub(Cookie, 'getCookie');
      getCookieStub.withArgs(Cookie.PUBLISHABLE_KEY).returns(publishableKey);

      httpCallback = sinon.spy();

      data = { query: '20 Jay Street' };
      getResponse = '{ meta: { code: 200 }, addresses: [{ latitude: 40.7039, longitude: -73.9867 }] }';

      Http.request('GET', 'https://api.radar.io/v1/geocode/forward', data, null, httpCallback);
    });

    afterEach(() => {
      global.XMLHttpRequest.restore();

      Cookie.getCookie.restore();
    });

    it('should always include Device-Type and SDK-Version headers', () => {
      expect(request).to.not.be.null;
      request.respond(200, {}, getResponse);

      expect(httpCallback).to.be.calledWith(STATUS.SUCCESS, getResponse);

      expect(request.requestHeaders['X-Radar-Device-Type'], 'Web');
      expect(request.requestHeaders['X-Radar-SDK-Version'], SDK_VERSION);
    });

    it('should inject GET parameters into the url querystring', () => {
      expect(request).to.not.be.null;
      request.respond(200, {}, getResponse);

      expect(httpCallback).to.be.calledWith(STATUS.SUCCESS, getResponse);

      const urlencodedData = encodeURIComponent(`query=${data.query}`);
      expect(request.url).to.contain(`?${urlencodedData}`);
    });
  });

  it('should return a publishable key error if not set', () => {
    global.XMLHttpRequest = sinon.useFakeXMLHttpRequest();

    let request;
    global.XMLHttpRequest.onCreate = (xhrRequest) => {
      request = xhrRequest;
    };

    getCookieStub = sinon.stub(Cookie, 'getCookie');
    getCookieStub.withArgs(Cookie.PUBLISHABLE_KEY).returns(null);

    const httpCallback = sinon.spy();

    Http.request('GET', 'https://api.radar.io/v1/geocode/forward', { query: '20 Jay Street' }, 'addresses', httpCallback);

    expect(httpCallback).to.be.calledWith(STATUS.ERROR_PUBLISHABLE_KEY);

    Cookie.getCookie.restore();
    global.XMLHttpRequest.restore();
  });

  it('should return a server error on invalid JSON', () => {
    global.XMLHttpRequest = sinon.useFakeXMLHttpRequest();

    let request;
    global.XMLHttpRequest.onCreate = (xhrRequest) => {
      request = xhrRequest;
    };

    getCookieStub = sinon.stub(Cookie, 'getCookie');
    getCookieStub.withArgs(Cookie.PUBLISHABLE_KEY).returns(publishableKey);

    const httpCallback = sinon.spy();
    Http.request('GET', 'https://api.radar.io/v1/geocode/forward', { query: '20 Jay Street' }, 'addresses', httpCallback);

    const jsonErrorResponse = '"invalid_json": true}';
    expect(request).to.not.be.null;
    request.respond(200, {}, jsonErrorResponse);

    expect(httpCallback).to.be.calledWith(STATUS.ERROR_SERVER);

    Cookie.getCookie.restore();
    global.XMLHttpRequest.restore();
  });

  it('should grab the nested payload via jsonKey', () => {
    global.XMLHttpRequest = sinon.useFakeXMLHttpRequest();

    let request;
    global.XMLHttpRequest.onCreate = (xhrRequest) => {
      request = xhrRequest;
    };

    getCookieStub = sinon.stub(Cookie, 'getCookie');
    getCookieStub.withArgs(Cookie.PUBLISHABLE_KEY).returns(publishableKey);

    const httpCallback = sinon.spy();
    Http.request('GET', 'https://api.radar.io/v1/geocode/forward', { query: '20 Jay Street' }, 'addresses', httpCallback);

    const jsonSuccessResponse = '{"addresses":["matching-addresses"]}';
    expect(request).to.not.be.null;
    request.respond(200, {}, jsonSuccessResponse);

    expect(httpCallback).to.be.calledWith(STATUS.SUCCESS, ['matching-addresses']);

    Cookie.getCookie.restore();
    global.XMLHttpRequest.restore();
  });
});
