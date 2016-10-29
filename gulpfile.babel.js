// generated on 2016-09-28 using generator-chrome-extension 0.6.1
const gulp = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const del = require('del');
const runSequence = require('run-sequence');
const wiredep= require('wiredep').stream; /* Wire Bower Dependencies */

const rollup = require('gulp-rollup');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('rollup-plugin-babel');
const sass = require('gulp-sass');

const $ = gulpLoadPlugins();

gulp.task('extras', () => {
  return gulp.src([
    'app/*.*',
    'app/_locales/**',
    'app/bower_components/font-awesome/**', /* bad solution, TODO: findout how to make it work correctly with wiredep */
    'app/styles/*.css',
    '!app/scripts.babel',
    '!app/*.json',
    '!app/*.html'
  ], {
    base: 'app',
    dot: true
  })
  .pipe(gulp.dest('dist'));
});

function lint(files, options) {
  return () => {
    return gulp.src(files)
      .pipe($.eslint(options))
      .pipe($.eslint.format());
  };
}

gulp.task('lint', lint('app/scripts.babel/**/*.js', {
  env: {
    es6: true
  }
}));

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
    .pipe($.if($.if.isFile, $.cache($.imagemin({
      progressive: true,
      interlaced: true,
      // don't remove IDs from SVGs, they are often used
      // as hooks for embedding and styling
      svgoPlugins: [{cleanupIDs: false}]
    }))
    .on('error', function (err) {
      console.log(err);
      this.end();
    })))
    .pipe(gulp.dest('dist/images'));
});

gulp.task('html',  () => {
  return gulp.src('app/*.html')
    .pipe($.useref({searchPath: ['.tmp', 'app', '.']}))
    .pipe($.sourcemaps.init())
    .pipe($.if('*.js', $.uglify()))
    .pipe($.if('*.css', $.cleanCss({compatibility: '*'})))
    .pipe($.sourcemaps.write())
    .pipe($.if('*.html', $.htmlmin({removeComments: true, collapseWhitespace: true})))
    .pipe(gulp.dest('dist'));
});

gulp.task('chromeManifest', () => {
  return gulp.src('app/manifest.json')
    .pipe($.chromeManifest({
      buildnumber: true,
      /*background: {
        target: 'scripts/background.js',
        exclude: [
          'scripts/chromereload.js'
        ]
      }*/
  }))
  .pipe($.debug({title: 'files from chromeManifest:'}))
  .pipe($.if('*.css', $.cleanCss({compatibility: '*'})))
  .pipe($.if('*.js', $.sourcemaps.init()))
  .pipe($.if('*.js', $.uglify()))
  .pipe($.if('*.js', $.sourcemaps.write('.')))
  .pipe(gulp.dest('dist'));
});
//
// gulp.task('res', function() {
//   const manifest = require('manifest.json');
//   return gulp.src(manifest.web_accessible_resource).
//         .pipe(gulpif('*.css', cssmin()))
//         .pipe(gulpif('*.js', sourcemaps.init()))
//         .pipe(gulpif('*.js', uglify()))
//         .pipe(gulpif('*.js', sourcemaps.write()))
//         .pipe(gulp.dest('dist'));
// });

gulp.task('rollup', function () {
  gulp
    .src('app/scripts.babel/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(rollup({
      entry: 'app/scripts.babel/contentscript.js',
      plugins: [
        babel({
          exclude: 'node_modules/**',
          presets: ['es2015-rollup'],
        }),
      ],
    }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('app/scripts'));
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

gulp.task('sass', function () {
  return gulp.src('app/styles/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('app/styles'));
});


gulp.task('watch', ['lint', 'rollup'], () => {
  $.livereload.listen();

  gulp.watch([
    'app/*.html',
    'app/scripts/**/*.js',
    'app/images/**/*',
    'app/styles/**/*',
    'app/_locales/**/*.json'
  ]).on('change', $.livereload.reload);

  gulp.watch('app/scripts.babel/**/*.js', ['lint', 'rollup']);
  gulp.watch('app/styles/*.scss', ['sass']);
  gulp.watch('bower.json', ['wiredep']);
});

gulp.task('size', () => {
  return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true}));
});

gulp.task('wiredep', () => {
  gulp.src('app/*.html')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe($.debug({title: 'wiredep:'}))
    .pipe(gulp.dest('app'));
});


gulp.task('package', ['build'], function () {
  var manifest = require('./dist/manifest.json');
  return gulp.src('dist/**')
      .pipe($.zip('real-reality-' + manifest.version + '.zip'))
      .pipe(gulp.dest('package'));
});

gulp.task('build', (cb) => {
  runSequence(
    'lint', 'rollup', 'chromeManifest',
    ['html', 'images', 'extras', 'sass'],
    'size', cb);
});

gulp.task('default', ['clean'], cb => {
  runSequence('build', cb);
});
