/**
Definition of the JRSTheme class.
@module jrs-theme.js
@license MIT. See LICENSE.MD for details.
*/

(function() {



  var _ = require('underscore')
    , PATH = require('path')
    , parsePath = require('parse-filepath')
    , pathExists = require('path-exists').sync;



  /**
  The JRSTheme class is a representation of a JSON Resume
  theme asset. See also: FRESHTheme.
  @class JRSTheme
  */
  function JRSTheme() {

  }



  /**
  Open and parse the specified theme.
  @method open
  */
  JRSTheme.prototype.open = function( thFolder ) {

    this.folder = thFolder;

    // Open the [theme-name].json file; should have the same
    // name as folder
    var pathInfo = parsePath( thFolder );

    // Open and parse the theme's package.json file.
    var pkgJsonPath = PATH.join( thFolder, 'package.json' );
    if( pathExists( pkgJsonPath )) {
      var thApi = require( thFolder )
        , thPkg = require( pkgJsonPath );
      this.name = thPkg.name;
      this.render = (thApi && thApi.render) || undefined;
      this.formats = {
        html: { title:'html', outFormat:'html', ext:'html' }
      };
    }
    else {
      throw { fluenterror: 10 };
    }

    return this;
  };



  /**
  Determine if the theme supports the output format.
  @method hasFormat
  */
  JRSTheme.prototype.hasFormat = function( fmt ) {
    return _.has( this.formats, fmt );
  };



  /**
  Return the requested output format.
  @method getFormat
  */
  JRSTheme.prototype.getFormat = function( fmt ) {
    return this.formats[ fmt ];
  };



  module.exports = JRSTheme;



}());
