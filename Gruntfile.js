/*
 * Used by `grunt` - see gruntjs.com.
 *
 * The purpose of this file is to help with working on the eden-js grammar, the
 * 'jison' task will generate the parser, the default task runs a web server
 * for testing the grammar and automatically regenerates the parser when the
 * grammar file changes.
 */

'use strict';

module.exports = function (grunt) {


  grunt.initConfig({

	browserify: {
		'construit-fgeo.js': ['index.js'],
		'fgeo-worker.js': ['js/worker.js']
	}
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.registerTask('default', ['browserify']);
};

