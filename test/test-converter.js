
var chai = require('chai')
  , expect = chai.expect
  , should = chai.should()
  , path = require('path')
  , parsePath = require('parse-filepath')
  , _ = require('underscore')
	, FRESHResume = require('../src/core/fresh-resume')
  , CONVERTER = require('../src/core/convert')
  , FS = require('fs')
  , MKDIRP = require('mkdirp')
  , _ = require('underscore');

chai.config.includeStack = false;

describe('FRESH/JRS converter', function () {

    var _sheet;

	  it('should round-trip from JRS to FRESH to JRS without modifying or losing data', function () {

      var fileA = path.join( __dirname, 'resumes/jrs-0.0.0/richard-hendriks.json' );
      var fileB = path.join( __dirname, 'sandbox/richard-hendriks.json' );

      _sheet = new FRESHResume().open( fileA );
      MKDIRP.sync( parsePath( fileB ).dirname );
      _sheet.saveAs( fileB, 'JRS' );

      var rawA = FS.readFileSync( fileA, 'utf8' );
      var rawB = FS.readFileSync( fileB, 'utf8' );

      var objA = JSON.parse( rawA );
      var objB = JSON.parse( rawB );

      _.isEqual(objA, objB).should.equal(true);

    });

});
