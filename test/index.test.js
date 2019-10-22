var request = require('supertest');
var express = require('express');
 
var app = require('../index');
 
describe('Index Page', function() {
  it("renders successfully", function(done) {
    request(app).get('/').expect(200, done);    
  })
})

describe('List Page', function() {
    it("renders successfully", function(done) {
      request(app).get('/list').expect(200, done);    
    })
  })