function sketch_header_background(p) {

  // p5 setup here
  p.setup = function () {
    p.frameRate(15);

    p.createCanvas(p.windowWidth, 250);
    p.colorMode(p.RGB, 255, 255, 255, 1);
    //p.background(255, 255, 255, 0);
    
    // generate dot matrix
    mat = new Matrix();
  }

  // p5 loop
  p.draw = function () {
    //dback();
    //p.background(255, 255, 255, 0);
    p.clear();
    mat.update();
    mat.draw();

  }

  // misc functions 
  p.mouseClicked = function (){
    mat.add_dot(p.mouseX, p.mouseY);
  }

  dback = function(){
    c1 = p.color(142, 202, 130);
    c2 = p.color(2, 48, 71);
    angle = p.PI / 6;
    dx = p.height * Math.cos(angle) / Math.sin(angle)
    for(let x = -dx; x < p.width; x++){
      n = p.map(x, -dx , p.width, 0, 1);
      let newc = p.lerpColor(c1,c2,n);
      p.stroke(newc);
      p.line(x, p.height, x + dx, 0);
    }
  }

  distance = function(x1, y1, x2, y2){
    return p.sqrt(p.pow(x1 - x2, 2) + p.pow(y1 - y2,2));
  }

  uniq_fast = function(a) {
    var seen = {};
    var out = [];
    var len = a.length;
    var j = 0;
    for(var i = 0; i < len; i++) {
         var item = a[i];
         if(seen[item] !== 1) {
               seen[item] = 1;
               out[j++] = item;
         }
    }
    return out;
  }


  // classes
  Matrix = class{
    constructor(){
      this.dotsCount = p.width / 8;
      this.dots = [];
      for(let i = 0; i < this.dotsCount; i++){
        this.dots.push(new Dot(p.random(0, p.width), p.random(0, p.height)));
      }
      this.connects = new Set();
    }

    add_dot(x, y){
      for (let i = 0; i < 3; i++){
        this.dots.push(new Dot(x, y));
        if (this.dots.length > 300){
          this.dots.shift();
        } 
      }
    }

    update(){
      // move them dots
      for (const dot of this.dots){
        dot.update();
      }

      // build quad tree
      let boundary = new Rectangle(0, 0, p.width, p.height);
      this.qt = new Quadtree(boundary, 6);
      for (const dot of this.dots){
        this.qt.insert(dot.pos);
      }

      // find all neighbors of each dots within X pixels
      for (const dot of this.dots){
        let dcircle = new Circle(dot.pos.x, dot.pos.y, 100);
        let neighbors = [];
        this.qt.query(dcircle, neighbors);
        for (const neighbor of neighbors){
          if (neighbor != dot.pos){
            this.connects.add([dot.pos, neighbor]);
          }
        }
      }
    }

    draw(){
      // the dots
      for (const dot of this.dots) {
        dot.draw();
      }
      
      // the quadtree for debugging
      //this.qt.draw();

      // the connects
      p.stroke(255, 255, 255, 1);
      for (const pair of this.connects){
        let d = p.map(distance(pair[0].x, pair[0].y, pair[1].x, pair[1].y), 0, 100, 0.8, 0);
        //p.stroke(255, 255, 255, d);
        p.strokeWeight(d * d);
        p.line(pair[0].x, pair[0].y, pair[1].x, pair[1].y);
      }
      this.connects.clear();

    }


  }


  Dot = class{
    constructor(x, y){
      this.pos = p.createVector(x, y);
      this.angle = p.random(0, p.TAU);
      this.speed = p.random(0.2, 0.6);
      this.vel = p.createVector(this.speed * Math.cos(this.angle), this.speed * Math.sin(this.angle));
      this.r = p.random(2, 4);
    }

    update(){
      // move the dot
      this.pos.add(this.vel);

      // send the dot to other side of screen
      if (this.pos.x < 0){
        this.pos.x = p.width;
      }
      if (this.pos.x > p.width){
        this.pos.x = 0;
      }
      if (this.pos.y < 0){
        this.pos.y = p.height;
      }
      if (this.pos.y > p.height){
        this.pos.y = 0;
      }
    }

    draw(){
      p.fill(255, 255, 255, 200, 0.6);
      p.noStroke();
      p.ellipse(this.pos.x, this.pos.y, this.r);
    }
  }


  Circle = class{
    constructor(x, y, r){
      this.x = x;
      this.y = y;
      this.r = r;
    }

    contains(point){
      return(distance(point.x, point.y, this.x, this.y) <= this.r)
    }

    draw(){
      p.stroke(255, 255, 255, 0.5);
      p.strokeWeight(0.2);
      p.ellipse(this.x, this.y, this.r);
    }
  }

  Rectangle = class{
    constructor(x, y, w, h){
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
    }

    contains(point){
      return(point.x >  this.x          &&
             point.x <= this.x + this.w &&
             point.y >  this.y          &&
             point.y <= this.y + this.h)
    }

    intersects(circle){
      let distX = Math.abs(circle.x - this.x - this.w/2);
      let distY = Math.abs(circle.y - this.y - this.h/2);

      if (distX > (this.w / 2 + circle.r)) {return false;}
      if (distY > (this.h / 2 + circle.r)) {return false;}

      if (distX <= (this.w / 2)) {return true;} 
      if (distY <= (this.h / 2)) {return true;}

      let dx = distX - this.w / 2;
      let dy = distY - this.h / 2;
      return  (dx * dx + dy * dy <= (circle.r * circle.r));
    }


    draw(){
      p.stroke(255, 255, 255, 0.1);
      p.noFill();
      p.rect(this.x, this.y, this.w, this.h);
    }
  }


  Quadtree = class{
    constructor(boundary, cap){
      this.boundary = boundary;
      this.capacity = cap;
      this.points = [];
      this.divided = false;
    }

    query(circle, arr){
      if(!this.boundary.intersects(circle)){
        return;
      } else {
        for (let p of this.points){
          if (circle.contains(p)){
            arr.push(p);
          }
        }
        if (this.divided){
          this.nw.query(circle, arr);
          this.sw.query(circle, arr);
          this.se.query(circle, arr);
          this.ne.query(circle, arr);
        }
        return arr;
      }
    }

    insert(point){
      if(!this.boundary.contains(point)){
        return;
      }
      if(this.points.length < this.capacity){
        this.points.push(point);
      } else {
        if (!this.divided){
          this.subdivide();
          this.divided = true;
        }
        this.nw.insert(point);
        this.sw.insert(point);
        this.se.insert(point);
        this.ne.insert(point);
        
      }
    }

    subdivide(){
      let x = this.boundary.x;
      let y = this.boundary.y;
      let w = this.boundary.w;
      let h = this.boundary.h;

      let rnw = new Rectangle(x + w / 2, y        , w / 2, h / 2);
      let rsw = new Rectangle(x + w / 2, y + h / 2, w / 2, h / 2);
      let rse = new Rectangle(x        , y + h / 2, w / 2, h / 2);
      let rne = new Rectangle(x        , y        , w / 2, h / 2);

      this.nw = new Quadtree(rnw, this.capacity);
      this.sw = new Quadtree(rsw, this.capacity);
      this.se = new Quadtree(rse, this.capacity);
      this.ne = new Quadtree(rne, this.capacity);

      this.divided = true;
    }

    draw(){
      this.boundary.draw();
      if (this.divided){
        this.nw.draw();
        this.sw.draw();
        this.se.draw();
        this.ne.draw();
      }
    }
  }
}

new p5(sketch_header_background, 'header_background')
