(function(Two) {

  /**
   * Constants
   */

  var min = Math.min, max = Math.max, round = Math.round,
    ceil = Math.ceil, floor = Math.floor,
    getComputedMatrix = Two.Utils.getComputedMatrix;

  var commands = {};
  var _ = Two.Utils;

  _.each(Two.Commands, function(v, k) {
    commands[k] = new RegExp(v);
  });

  var Path = Two.Path = function(vertices, closed, curved, manual) {

    Two.Shape.call(this);

    this._renderer.type = 'path';
    this._renderer.flagVertices = _.bind(Path.FlagVertices, this);
    this._renderer.bindVertices = _.bind(Path.BindVertices, this);
    this._renderer.unbindVertices = _.bind(Path.UnbindVertices, this);

    this._renderer.flagFill = _.bind(Path.FlagFill, this);
    this._renderer.flagStroke = _.bind(Path.FlagStroke, this);
    this._renderer.vertices = [];
    this._renderer.collection = [];

    this._closed = !!closed;
    this._curved = !!curved;

    this.beginning = 0;
    this.ending = 1;

    // Style properties

    this.fill = '#fff';
    this.stroke = '#000';
    this.linewidth = 1.0;
    this.opacity = 1.0;
    this.className = '';
    this.visible = true;

    this.cap = 'butt';      // Default of Adobe Illustrator
    this.join = 'miter';    // Default of Adobe Illustrator
    this.miter = 4;         // Default of Adobe Illustrator

    this.vertices = vertices;

    // Determines whether or not two.js should calculate curves, lines, and
    // commands automatically for you or to let the developer manipulate them
    // for themselves.
    this.automatic = !manual;

  };

  _.extend(Path, {

    Properties: [
      'fill',
      'stroke',
      'linewidth',
      'opacity',
      'className',
      'visible',
      'cap',
      'join',
      'miter',

      'closed',
      'curved',
      'automatic',
      'beginning',
      'ending'
    ],

    FlagVertices: function() {
      this._flagVertices = true;
      this._flagLength = true;
    },

    BindVertices: function(items) {

      // This function is called a lot
      // when importing a large SVG
      var i = items.length;
      while (i--) {
        items[i].bind(Two.Events.change, this._renderer.flagVertices);
      }

      this._renderer.flagVertices();

    },

    UnbindVertices: function(items) {

      var i = items.length;
      while (i--) {
        items[i].unbind(Two.Events.change, this._renderer.flagVertices);
      }

      this._renderer.flagVertices();

    },

    FlagFill: function() {
      this._flagFill = true;
    },

    FlagStroke: function() {
      this._flagStroke = true;
    },

    MakeObservable: function(object) {

      Two.Shape.MakeObservable(object);

      // Only the 7 defined properties are flagged like this. The subsequent
      // properties behave differently and need to be hand written.
      _.each(Path.Properties.slice(2, 9), Two.Utils.defineProperty, object);

      Object.defineProperty(object, 'fill', {
        enumerable: true,
        get: function() {
          return this._fill;
        },
        set: function(f) {

          if (this._fill instanceof Two.Gradient
            || this._fill instanceof Two.LinearGradient
            || this._fill instanceof Two.RadialGradient
            || this._fill instanceof Two.Texture) {
            this._fill.unbind(Two.Events.change, this._renderer.flagFill);
          }

          this._fill = f;
          this._flagFill = true;

          if (this._fill instanceof Two.Gradient
            || this._fill instanceof Two.LinearGradient
            || this._fill instanceof Two.RadialGradient
            || this._fill instanceof Two.Texture) {
            this._fill.bind(Two.Events.change, this._renderer.flagFill);
          }

        }
      });

      Object.defineProperty(object, 'stroke', {
        enumerable: true,
        get: function() {
          return this._stroke;
        },
        set: function(f) {

          if (this._stroke instanceof Two.Gradient
            || this._stroke instanceof Two.LinearGradient
            || this._stroke instanceof Two.RadialGradient
            || this._stroke instanceof Two.Texture) {
            this._stroke.unbind(Two.Events.change, this._renderer.flagStroke);
          }

          this._stroke = f;
          this._flagStroke = true;

          if (this._stroke instanceof Two.Gradient
            || this._stroke instanceof Two.LinearGradient
            || this._stroke instanceof Two.RadialGradient
            || this._stroke instanceof Two.Texture) {
            this._stroke.bind(Two.Events.change, this._renderer.flagStroke);
          }

        }
      });

      Object.defineProperty(object, 'length', {
        get: function() {
          if (this._flagLength) {
            this._updateLength();
          }
          return this._length;
        }
      });

      Object.defineProperty(object, 'closed', {
        enumerable: true,
        get: function() {
          return this._closed;
        },
        set: function(v) {
          this._closed = !!v;
          this._flagVertices = true;
        }
      });

      Object.defineProperty(object, 'curved', {
        enumerable: true,
        get: function() {
          return this._curved;
        },
        set: function(v) {
          this._curved = !!v;
          this._flagVertices = true;
        }
      });

      Object.defineProperty(object, 'automatic', {
        enumerable: true,
        get: function() {
          return this._automatic;
        },
        set: function(v) {
          if (v === this._automatic) {
            return;
          }
          this._automatic = !!v;
          var method = this._automatic ? 'ignore' : 'listen';
          _.each(this.vertices, function(v) {
            v[method]();
          });
        }
      });

      Object.defineProperty(object, 'beginning', {
        enumerable: true,
        get: function() {
          return this._beginning;
        },
        set: function(v) {
          this._beginning = v;
          this._flagVertices = true;
        }
      });

      Object.defineProperty(object, 'ending', {
        enumerable: true,
        get: function() {
          return this._ending;
        },
        set: function(v) {
          this._ending = v;
          this._flagVertices = true;
        }
      });

      Object.defineProperty(object, 'vertices', {

        enumerable: true,

        get: function() {
          return this._collection;
        },

        set: function(vertices) {

          var updateVertices = this._renderer.flagVertices;
          var bindVertices = this._renderer.bindVertices;
          var unbindVertices = this._renderer.unbindVertices;

          // Remove previous listeners
          if (this._collection) {
            this._collection
              .unbind(Two.Events.insert, bindVertices)
              .unbind(Two.Events.remove, unbindVertices);
          }

          // Create new Collection with copy of vertices
          this._collection = new Two.Utils.Collection((vertices || []).slice(0));

          // Listen for Collection changes and bind / unbind
          this._collection
            .bind(Two.Events.insert, bindVertices)
            .bind(Two.Events.remove, unbindVertices);

          // Bind Initial Vertices
          bindVertices(this._collection);

        }

      });

      Object.defineProperty(object, 'clip', {
        enumerable: true,
        get: function() {
          return this._clip;
        },
        set: function(v) {
          this._clip = v;
          this._flagClip = true;
        }
      });

    }

  });

  _.extend(Path.prototype, Two.Shape.prototype, {

    // Flags
    // http://en.wikipedia.org/wiki/Flag

    _flagVertices: true,
    _flagLength: true,

    _flagFill: true,
    _flagStroke: true,
    _flagLinewidth: true,
    _flagOpacity: true,
    _flagVisible: true,
    _flagClassName: true,

    _flagCap: true,
    _flagJoin: true,
    _flagMiter: true,

    _flagClip: false,

    // Underlying Properties

    _length: 0,

    _fill: '#fff',
    _stroke: '#000',
    _linewidth: 1.0,
    _opacity: 1.0,
    _className: '',
    _visible: true,

    _cap: 'round',
    _join: 'round',
    _miter: 4,

    _closed: true,
    _curved: false,
    _automatic: true,
    _beginning: 0,
    _ending: 1.0,

    _clip: false,

    clone: function(parent) {

      parent = parent || this.parent;

      var points = _.map(this.vertices, function(v) {
        return v.clone();
      });

      var clone = new Path(points, this.closed, this.curved, !this.automatic);

      _.each(Path.Properties, function(k) {
        clone[k] = this[k];
      }, this);

      clone.translation.copy(this.translation);
      clone.rotation = this.rotation;
      clone.scale = this.scale;

      if (parent) {
        parent.add(clone);
      }

      return clone;

    },

    toObject: function() {

      var result = {
        vertices: _.map(this.vertices, function(v) {
          return v.toObject();
        })
      };

      _.each(Two.Shape.Properties, function(k) {
        result[k] = this[k];
      }, this);

      result.translation = this.translation.toObject;
      result.rotation = this.rotation;
      result.scale = this.scale;

      return result;

    },

    noFill: function() {
      this.fill = 'transparent';
      return this;
    },

    noStroke: function() {
      this.stroke = 'transparent';
      return this;
    },

    /**
     * Orient the vertices of the shape to the upper lefthand
     * corner of the path.
     */
    corner: function() {

      var rect = this.getBoundingClientRect(true);

      rect.centroid = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      _.each(this.vertices, function(v) {
        v.addSelf(rect.centroid);
      });

      return this;

    },

    /**
     * Orient the vertices of the shape to the center of the
     * path.
     */
    center: function() {

      var rect = this.getBoundingClientRect(true);

      rect.centroid = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      _.each(this.vertices, function(v) {
        v.subSelf(rect.centroid);
      });

      // this.translation.addSelf(rect.centroid);

      return this;

    },

    /**
     * Remove self from the scene / parent.
     */
    remove: function() {

      if (!this.parent) {
        return this;
      }

      this.parent.remove(this);

      return this;

    },

    /**
     * Return an object with top, left, right, bottom, width, and height
     * parameters of the group.
     */
    getBoundingClientRect: function(shallow) {
      var matrix, border, l, x, y, i, v;

      var left = Infinity, right = -Infinity,
          top = Infinity, bottom = -Infinity;

      // TODO: Update this to not __always__ update. Just when it needs to.
      this._update(true);

      matrix = !!shallow ? this._matrix : getComputedMatrix(this);

      border = this.linewidth / 2;
      l = this._renderer.vertices.length;

      if (l <= 0) {
        v = matrix.multiply(0, 0, 1);
        return {
          top: v.y,
          left: v.x,
          right: v.x,
          bottom: v.y,
          width: 0,
          height: 0
        };
      }

      for (i = 0; i < l; i++) {
        v = this._renderer.vertices[i];

        x = v.x;
        y = v.y;

        v = matrix.multiply(x, y, 1);
        top = min(v.y - border, top);
        left = min(v.x - border, left);
        right = max(v.x + border, right);
        bottom = max(v.y + border, bottom);
      }

      return {
        top: top,
        left: left,
        right: right,
        bottom: bottom,
        width: right - left,
        height: bottom - top
      };

    },

    /**
     * Given a float `t` from 0 to 1, return a point or assign a passed `obj`'s
     * coordinates to that percentage on this Two.Path's curve.
     */
    getPointAt: function(t, obj) {

      var ia, ib, result;
      var x, x1, x2, x3, x4, y, y1, y2, y3, y4, left, right;
      var target = this.length * Math.min(Math.max(t, 0), 1);
      var length = this.vertices.length;
      var last = length - 1;

      var a = null;
      var b = null;

      if (t >= 1) {

        var v = this.vertices[last];

        if (_.isObject(obj)) {

          obj.x = v.x;
          obj.y = v.y;

          if (_.isObject(v.controls)) {

            if (!_.isObject(obj.controls)) {
              Two.Anchor.AppendCurveProperties(obj);
            }

            obj.controls.left.x = v.controls.left.x;
            obj.controls.left.y = v.controls.left.y;
            obj.controls.right.x = v.controls.right.x;
            obj.controls.right.y = v.controls.right.y;

            if (v.relative && _.isBoolean(obj.relative) && !obj.relative) {
              obj.controls.left.x += v.x;
              obj.controls.left.y += v.y;
              obj.controls.right.x += v.x;
              obj.controls.right.y += v.y;
            } else if (!v.relative && (!_.isBoolean(obj.relative) || obj.relative)) {
              obj.controls.left.x -= v.x;
              obj.controls.left.y -= v.y;
              obj.controls.right.x -= v.x;
              obj.controls.right.y -= v.y;
            }

          }

          obj.t = 1;

          return obj;

        }

        result = v.clone();
        result.t = 1;

        return v;

      } else if (t <= 0) {

        var v = this.vertices[0];

        if (_.isObject(obj)) {

          obj.x = v.x;
          obj.y = v.y;

          if (_.isObject(v.controls)) {

            if (!_.isObject(obj.controls)) {
              Two.Anchor.AppendCurveProperties(obj);
            }

            obj.controls.left.x = v.controls.left.x;
            obj.controls.left.y = v.controls.left.y;
            obj.controls.right.x = v.controls.right.x;
            obj.controls.right.y = v.controls.right.y;

            if (v.relative && _.isBoolean(obj.relative) && !obj.relative) {
              obj.controls.left.x += v.x;
              obj.controls.left.y += v.y;
              obj.controls.right.x += v.x;
              obj.controls.right.y += v.y;
            } else if (!v.relative && (!_.isBoolean(obj.relative) || obj.relative)) {
              obj.controls.left.x -= v.x;
              obj.controls.left.y -= v.y;
              obj.controls.right.x -= v.x;
              obj.controls.right.y -= v.y;
            }

          }

          obj.t = 0;

          return obj;

        }

        result = v.clone();
        result.t = 0;

        return result;

      }

      for (var i = 0, l = this._lengths.length, sum = 0; i < l; i++) {

        if (sum + this._lengths[i] >= target) {

          if (this._closed) {
            ia = Two.Utils.mod(i, length);
            ib = Two.Utils.mod(i - 1, length);
            if (i === 0) {
              ia = ib;
              ib = i;
            }
          } else {
            ia = i;
            ib = Math.min(Math.max(i - 1, 0), last);
          }

          a = this.vertices[ia];
          b = this.vertices[ib];
          target -= sum;
          if (this._lengths[i] !== 0) {
            t = target / this._lengths[i];
          } else {
            t = 0;
          }

          break;

        }

        sum += this._lengths[i];

      }

      // console.log(sum, a, b);

      if (_.isNull(a) || _.isNull(b)) {
        return null;
      }

      right = b.controls && b.controls.right;
      left = a.controls && a.controls.left;

      x1 = b.x;
      y1 = b.y;
      x2 = (right || b).x;
      y2 = (right || b).y;
      x3 = (left || a).x;
      y3 = (left || a).y;
      x4 = a.x;
      y4 = a.y;

      if (right && b._relative) {
        x2 += b.x;
        y2 += b.y;
      }

      if (left && a._relative) {
        x3 += a.x;
        y3 += a.y;
      }

      x = Two.Utils.getPointOnCubicBezier(t, x1, x2, x3, x4);
      y = Two.Utils.getPointOnCubicBezier(t, y1, y2, y3, y4);

      // Higher order points for control calculation.
      var t1x = Two.Utils.lerp(x1, x2, t);
      var t1y = Two.Utils.lerp(y1, y2, t);
      var t2x = Two.Utils.lerp(x2, x3, t);
      var t2y = Two.Utils.lerp(y2, y3, t);
      var t3x = Two.Utils.lerp(x3, x4, t);
      var t3y = Two.Utils.lerp(y3, y4, t);

      // Calculate the returned points control points.
      var brx = Two.Utils.lerp(t1x, t2x, t);
      var bry = Two.Utils.lerp(t1y, t2y, t);
      var alx = Two.Utils.lerp(t2x, t3x, t);
      var aly = Two.Utils.lerp(t2y, t3y, t);

      if (_.isObject(obj)) {

        obj.x = x;
        obj.y = y;

        if (!_.isObject(obj.controls)) {
          Two.Anchor.AppendCurveProperties(obj);
        }

        obj.controls.left.x = brx;
        obj.controls.left.y = bry;
        obj.controls.right.x = alx;
        obj.controls.right.y = aly;

        if (!_.isBoolean(obj.relative) || obj.relative) {
          obj.controls.left.x -= x;
          obj.controls.left.y -= y;
          obj.controls.right.x -= x;
          obj.controls.right.y -= y;
        }

        obj.t = t;

        return obj;

      }

      result = new Two.Anchor(
        x, y, brx - x, bry - y, alx - x, aly - y,
        this._curved ? Two.Commands.curve : Two.Commands.line
      );

      result.t = t;

      return result;

    },

    /**
     * Based on closed / curved and sorting of vertices plot where all points
     * should be and where the respective handles should be too.
     */
    plot: function() {

      if (this.curved) {
        Two.Utils.getCurveFromPoints(this._collection, this.closed);
        return this;
      }

      for (var i = 0; i < this._collection.length; i++) {
        this._collection[i].command = i === 0 ? Two.Commands.move : Two.Commands.line;
      }

      return this;

    },

    subdivide: function(limit) {
      //TODO: DRYness (function below)
      this._update();

      var last = this.vertices.length - 1;
      var b = this.vertices[last];
      var closed = this._closed || this.vertices[last]._command === Two.Commands.close;
      var points = [];
      _.each(this.vertices, function(a, i) {

        if (i <= 0 && !closed) {
          b = a;
          return;
        }

        if (a.command === Two.Commands.move) {
          points.push(new Two.Anchor(b.x, b.y));
          if (i > 0) {
            points[points.length - 1].command = Two.Commands.line;
          }
          b = a;
          return;
        }

        var verts = getSubdivisions(a, b, limit);
        points = points.concat(verts);

        // Assign commands to all the verts
        _.each(verts, function(v, i) {
          if (i <= 0 && b.command === Two.Commands.move) {
            v.command = Two.Commands.move;
          } else {
            v.command = Two.Commands.line;
          }
        });

        if (i >= last) {

          // TODO: Add check if the two vectors in question are the same values.
          if (this._closed && this._automatic) {

            b = a;

            verts = getSubdivisions(a, b, limit);
            points = points.concat(verts);

            // Assign commands to all the verts
            _.each(verts, function(v, i) {
              if (i <= 0 && b.command === Two.Commands.move) {
                v.command = Two.Commands.move;
              } else {
                v.command = Two.Commands.line;
              }
            });

          } else if (closed) {
            points.push(new Two.Anchor(a.x, a.y));
          }

          points[points.length - 1].command = closed ? Two.Commands.close : Two.Commands.line;

        }

        b = a;

      }, this);

      this._automatic = false;
      this._curved = false;
      this.vertices = points;

      return this;

    },

    _updateLength: function(limit, silent) {
      //TODO: DRYness (function above)
      if (!silent) {
        this._update();
      }

      var length = this.vertices.length;
      var last = length - 1;
      var b = this.vertices[last];
      var closed = this._closed || this.vertices[last]._command === Two.Commands.close;
      var sum = 0;

      if (_.isUndefined(this._lengths)) {
        this._lengths = [];
      }

      _.each(this.vertices, function(a, i) {

        if ((i <= 0 && !closed) || a.command === Two.Commands.move) {
          b = a;
          this._lengths[i] = 0;
          return;
        }

        this._lengths[i] = getCurveLength(a, b, limit);
        sum += this._lengths[i];

        if (i >= last && closed) {

          b = this.vertices[(i + 1) % length];

          this._lengths[i + 1] = getCurveLength(a, b, limit);
          sum += this._lengths[i + 1];

        }

        b = a;

      }, this);

      this._length = sum;
      this._flagLength = false;

      return this;

    },

    _update: function() {

      if (this._flagVertices) {

        if (this._automatic) {
          this.plot();
        }

        if (this._flagLength) {
          this._updateLength(undefined, true);
        }

        var l = this._collection.length;
        var last = l - 1;

        var beginning = this._beginning;
        var ending = this._ending;

        var bid, eid;

        if (this._closed) {
          bid = beginning * l;
          eid = ending * l;
        } else {
          bid = beginning * last;
          eid = ending * last;
        }

        var low = ceil(min(bid, eid));
        var high = floor(max(bid, eid));

        var left, right, prev, next, v;

        this._renderer.vertices.length = 0;

        for (var i = 0; i < l; i++) {

          if (this._renderer.collection.length <= i) {
            // Expected to be `relative` anchor points.
            this._renderer.collection.push(new Two.Anchor());
          }

          if (i > high && !right) {

            v = this._renderer.collection[i]
              .copy(this._collection[i]);
            this.getPointAt(ending, v);
            this._renderer.vertices.push(v);

            right = v;
            prev = this._collection[i - 1];

            // Project control over the percentage `t`
            // of the in-between point
            if (prev && prev.controls) {
              this._renderer.collection[i - 1].controls.right
                .clear()
                .lerp(prev.controls.right, v.t);
            }

          } else if (i >= low && i <= high) {

            v = this._renderer.collection[i]
              .copy(this._collection[i]);
            this._renderer.vertices.push(v);

          }

        }

        // Prepend the trimmed point if necessary.
        if (low - 1 >= 0) {

          i = low - 1;

          v = this._renderer.collection[i]
            .copy(this._collection[i]);
          this.getPointAt(beginning, v);
          v.command = Two.Commands.move;
          this._renderer.vertices.unshift(v);

          left = v;
          next = this._collection[i + 1];

          // Project control over the percentage `t`
          // of the in-between point
          if (!this._closed && next && next.controls) {
            this._renderer.collection[i + 1].controls.left
              .copy(next.controls.left)
              .lerp(Two.Vector.zero, v.t);
          }

        }

      }

      Two.Shape.prototype._update.apply(this, arguments);

      return this;

    },

    flagReset: function() {

      this._flagVertices =  this._flagFill =  this._flagStroke =
         this._flagLinewidth = this._flagOpacity = this._flagVisible =
         this._flagCap = this._flagJoin = this._flagMiter =
         this._flagClassName = this._flagClip = false;

      Two.Shape.prototype.flagReset.call(this);

      return this;

    }

  });

  Path.MakeObservable(Path.prototype);

  /**
   * Utility functions
   */

  function getCurveLength(a, b, limit) {
    // TODO: DRYness
    var x1, x2, x3, x4, y1, y2, y3, y4;

    var right = b.controls && b.controls.right;
    var left = a.controls && a.controls.left;

    x1 = b.x;
    y1 = b.y;
    x2 = (right || b).x;
    y2 = (right || b).y;
    x3 = (left || a).x;
    y3 = (left || a).y;
    x4 = a.x;
    y4 = a.y;

    if (right && b._relative) {
      x2 += b.x;
      y2 += b.y;
    }

    if (left && a._relative) {
      x3 += a.x;
      y3 += a.y;
    }

    return Two.Utils.getCurveLength(x1, y1, x2, y2, x3, y3, x4, y4, limit);

  }

  function getSubdivisions(a, b, limit) {
    // TODO: DRYness
    var x1, x2, x3, x4, y1, y2, y3, y4;

    var right = b.controls && b.controls.right;
    var left = a.controls && a.controls.left;

    x1 = b.x;
    y1 = b.y;
    x2 = (right || b).x;
    y2 = (right || b).y;
    x3 = (left || a).x;
    y3 = (left || a).y;
    x4 = a.x;
    y4 = a.y;

    if (right && b._relative) {
      x2 += b.x;
      y2 += b.y;
    }

    if (left && a._relative) {
      x3 += a.x;
      y3 += a.y;
    }

    return Two.Utils.subdivide(x1, y1, x2, y2, x3, y3, x4, y4, limit);

  }

})((typeof global !== 'undefined' ? global : (this || window)).Two);
