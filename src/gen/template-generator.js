/**
Definition of the TemplateGenerator class.
@license MIT. See LICENSE.md for details.
@module template-generator.js
*/

(function() {



  var FS = require( 'fs-extra' )
    , _ = require( 'underscore' )
    , MD = require( 'marked' )
    , XML = require( 'xml-escape' )
    , PATH = require('path')
    , parsePath = require('parse-filepath')
    , MKDIRP = require('mkdirp')
    , BaseGenerator = require( './base-generator' )
    , EXTEND = require('../utils/extend')
    , FRESHTheme = require('../core/fresh-theme')
    , JRSTheme = require('../core/jrs-theme');



  // Default options.
  var _defaultOpts = {
    engine: 'underscore',
    keepBreaks: true,
    freezeBreaks: false,
    nSym: '&newl;', // newline entity
    rSym: '&retn;', // return entity
    template: {
      interpolate: /\{\{(.+?)\}\}/g,
      escape: /\{\{\=(.+?)\}\}/g,
      evaluate: /\{\%(.+?)\%\}/g,
      comment: /\{\#(.+?)\#\}/g
    },
    filters: {
      out: function( txt ) { return txt; },
      raw: function( txt ) { return txt; },
      xml: function( txt ) { return XML(txt); },
      md: function( txt ) { return MD( txt || '' ); },
      mdin: function( txt ) {
        return MD(txt || '' ).replace(/^\s*<p>|<\/p>\s*$/gi, '');
      },
      lower: function( txt ) { return txt.toLowerCase(); },
      link: function( name, url ) { return url ?
        '<a href="' + url + '">' + name + '</a>' : name; }
    },
    prettify: { // ← See https://github.com/beautify-web/js-beautify#options
      indent_size: 2,
      unformatted: ['em','strong','a'],
      max_char: 80, // ← See lib/html.js in above-linked repo
      //wrap_line_length: 120, <-- Don't use this
    }
  };



  /**
  TemplateGenerator performs resume generation via local Handlebar or Underscore
  style template expansion and is appropriate for text-based formats like HTML,
  plain text, and XML versions of Microsoft Word, Excel, and OpenOffice.
  @class TemplateGenerator
  */
  var TemplateGenerator = module.exports = BaseGenerator.extend({



    init: function( outputFormat, templateFormat, cssFile ){
      this._super( outputFormat );
      this.tplFormat = templateFormat || outputFormat;
    },


    /**
    String-based template generation method.
    @method invoke
    @param rez A FreshResume object.
    @param opts Generator options.
    @returns An array of objects representing the generated output files. Each
    object has this format:

        {
          files: [ { info: { }, data: [ ] }, { ... } ],
          themeInfo: { }
        }

    */
    invoke: function( rez, opts ) {

      // Carry over options
      this.opts = EXTEND( true, { }, _defaultOpts, opts );

      // Load the theme
      var themeInfo = themeFromMoniker.call( this );
      var theme = themeInfo.theme;
      var tFolder = themeInfo.folder;
      var tplFolder = PATH.join( tFolder, 'src' );
      var curFmt = theme.getFormat( this.format );
      var that = this;

      // "Generate": process individual files within the theme
      return {
        files: curFmt.files.map( function( tplInfo ) {
          return {
            info: tplInfo,
            data: tplInfo.action === 'transform' ?
              transform.call( that, rez, tplInfo, theme ) : undefined
          };
        }).filter(function(item){ return item !== null; }),
        themeInfo: themeInfo
      };

    },



    /**
    File-based template generation method.
    @method generate
    @param rez A FreshResume object.
    @param f Full path to the output resume file to generate.
    @param opts Generator options.
    */
    generate: function( rez, f, opts ) {

      // Call the generation method
      var genInfo = this.invoke( rez, opts );

      // Carry over options
      this.opts = EXTEND( true, { }, _defaultOpts, opts );

      // Load the theme
      var themeInfo = genInfo.themeInfo;
      var theme = themeInfo.theme;
      var tFolder = themeInfo.folder;
      var tplFolder = PATH.join( tFolder, 'src' );
      var outFolder = parsePath(f).dirname;
      var curFmt = theme.getFormat( this.format );
      var that = this;

      // "Generate": process individual files within the theme
      genInfo.files.forEach(function( file ){

        var thisFilePath;

        if( file.info.action === 'transform' ) {
          thisFilePath = PATH.join( outFolder, file.info.orgPath );
          try {
            if( that.onBeforeSave ) {
              file.data = that.onBeforeSave({
                theme: theme,
                outputFile: (file.info.major ? f : thisFilePath),
                mk: file.data,
                opts: that.opts
              });
              if( !file.data ) return; // PDF etc
            }
            var fileName = file.info.major ? f : thisFilePath;
            MKDIRP.sync( PATH.dirname( fileName ) );
            FS.writeFileSync( fileName, file.data,
              { encoding: 'utf8', flags: 'w' } );
            that.onAfterSave && that.onAfterSave(
              { outputFile: fileName, mk: file.data, opts: that.opts } );
          }
          catch(ex) {
            require('../core/error-handler').err(ex, false);
          }
        }
        else if( file.info.action === null/* && theme.explicit*/ ) {
          thisFilePath = PATH.join( outFolder, file.info.orgPath );
          try {
            MKDIRP.sync( PATH.dirname(thisFilePath) );
            FS.copySync( file.info.path, thisFilePath );
          }
          catch(ex) {
            console.log(ex);
          }
        }
      });

      // Some themes require a symlink structure. If so, create it.
      if( curFmt.symLinks ) {
        Object.keys( curFmt.symLinks ).forEach( function(loc) {
          var absLoc = PATH.join(outFolder, loc);
          var absTarg = PATH.join(PATH.dirname(absLoc), curFmt.symLinks[loc]);
           // 'file', 'dir', or 'junction' (Windows only)
          var type = parsePath( absLoc ).extname ? 'file' : 'junction';
          FS.symlinkSync( absTarg, absLoc, type);
        });
      }

      return genInfo;

    },



    /**
    Perform a single resume JSON-to-DEST resume transformation.
    @param json A FRESH or JRS resume object.
    @param jst The stringified template data
    @param format The format name, such as "html" or "latex"
    @param cssInfo Needs to be refactored.
    @param opts Options and passthrough data.
    */
    single: function( json, jst, format, cssInfo, opts, theme ) {
      this.opts.freezeBreaks && ( jst = freeze(jst) );

      var eng = require( '../eng/' + theme.engine  + '-generator' );
      var result = eng.generate( json, jst, format, cssInfo, opts, theme );

      this.opts.freezeBreaks && ( result = unfreeze(result) );
      return result;
    }


  });



  /**
  Export the TemplateGenerator function/ctor.
  */
  module.exports = TemplateGenerator;



  /**
  Given a theme title, load the corresponding theme.
  */
  function themeFromMoniker() {

    // Verify the specified theme name/path
    var tFolder = PATH.join(
      parsePath( require.resolve('fresh-themes') ).dirname,
      '/themes/',
      this.opts.theme
    );

    var t;
    if( this.opts.theme.startsWith('jsonresume-theme-') ) {
      t = new JRSTheme().open( tFolder );
    }
    else {
      var exists = require('path-exists').sync;
      if( !exists( tFolder ) ) {
        tFolder = PATH.resolve( this.opts.theme );
        if( !exists( tFolder ) ) {
          throw { fluenterror: this.codes.themeNotFound, data: this.opts.theme};
        }
      }
      t = this.opts.themeObj || new FRESHTheme().open( tFolder );
    }

    // Load the theme and format
    return {
      theme: t,
      folder: tFolder
    };
  }



  function transform( rez, tplInfo, theme ) {
    try {
      var cssInfo = {
        file: tplInfo.css ? tplInfo.cssPath : null,
        data: tplInfo.css || null
      };

      return this.single( rez, tplInfo.data, this.format, cssInfo, this.opts,
        theme );
    }
    catch(ex) {
      console.log(ex);
      throw ex;
    }
  }



  /**
  Freeze newlines for protection against errant JST parsers.
  */
  function freeze( markup ) {
    return markup
      .replace( _reg.regN, _defaultOpts.nSym )
      .replace( _reg.regR, _defaultOpts.rSym );
  }



  /**
  Unfreeze newlines when the coast is clear.
  */
  function unfreeze( markup ) {
    return markup
      .replace( _reg.regSymR, '\r' )
      .replace( _reg.regSymN, '\n' );
  }



  /**
  Regexes for linebreak preservation.
  */
  var _reg = {
    regN: new RegExp( '\n', 'g' ),
    regR: new RegExp( '\r', 'g' ),
    regSymN: new RegExp( _defaultOpts.nSym, 'g' ),
    regSymR: new RegExp( _defaultOpts.rSym, 'g' )
  };



}());
