 // ---------------------------------------------------------------------------------------------------------------------------------
  // function calculateDistance3D(x1, y1, z1, x2, y2, z2) {
  //   return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2));
  // }

  // Line simplification based on
  // the Ramer–Douglas–Peucker algorithm
  // referance https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm
  // points are and array of arrays consisting of [[x,y],[x,y],...,[x,y]]
  // length is in pixels and is the square of the actual distance.
  // returns array of points of the same form as the input argument points.
  export const simplifyLineRDP = function (points, length) {
    let simplify = function (start, end) {
      // recursize simplifies points from start to end
      let maxDist,
        index,
        xx,
        yy,
        dx,
        dy,
        ddx,
        ddy,
        p1,
        p2,
        p,
        t,
        dist,
        dist1;
      p1 = points[start];
      p2 = points[end];
      xx = p1[0];
      yy = p1[1];
      ddx = p2[0] - xx;
      ddy = p2[1] - yy;
      dist1 = ddx * ddx + ddy * ddy;
      maxDist = length;
      for (let i = start + 1; i < end; i++) {
        p = points[i];
        if (ddx !== 0 || ddy !== 0) {
          t = ((p[0] - xx) * ddx + (p[1] - yy) * ddy) / dist1;
          if (t > 1) {
            dx = p[0] - p2[0];
            dy = p[1] - p2[1];
          } else if (t > 0) {
            dx = p[0] - (xx + ddx * t);
            dy = p[1] - (yy + ddy * t);
          } else {
            dx = p[0] - xx;
            dy = p[1] - yy;
          }
        } else {
          dx = p[0] - xx;
          dy = p[1] - yy;
        }
        dist = dx * dx + dy * dy;
        if (dist > maxDist) {
          index = i;
          maxDist = dist;
        }
      }

      if (maxDist > length) {
        // continue simplification while maxDist > length
        if (index - start > 1) {
          simplify(start, index);
        }
        newLine.push(points[index]);
        if (end - index > 1) {
          simplify(index, end);
        }
      }
    };
    let end = points.length - 1;
    let newLine = [points[0]];
    simplify(0, end);
    newLine.push(points[end]);
    return newLine;
  };

  // This is my own smoothing method
  // It creates a set of bezier control points either 2nd order or third order
  // bezier curves.
  // points: list of points
  // cornerThres: when to smooth corners and represents the angle between to lines.
  //     When the angle is smaller than the cornerThres then smooth.
  // match: if true then the control points will be balanced.
  // Function will make a copy of the points

  export const smoothLine = function (points, cornerThres, match) {
    // adds bezier control points at points if lines have angle less than thres
    let p1,
      p2,
      p3,
      dist1,
      dist2,
      x,
      y,
      endP,
      len,
      angle,
      i,
      newPoints,
      aLen,
      closed,
      nx1,
      nx2,
      ny1,
      ny2,
      np;
    function dot(x, y, xx, yy) {
      // get do product
      // dist1,dist2,nx1,nx2,ny1,ny2 are the length and  normals and used outside function
      // normalise both vectors
      dist1 = Math.sqrt(x * x + y * y); // get length
      if (dist1 > 0) {
        // normalise
        nx1 = x / dist1;
        ny1 = y / dist1;
      } else {
        nx1 = 1; // need to have something so this will do as good as anything
        ny1 = 0;
      }
      dist2 = Math.sqrt(xx * xx + yy * yy);
      if (dist2 > 0) {
        nx2 = xx / dist2;
        ny2 = yy / dist2;
      } else {
        nx2 = 1;
        ny2 = 0;
      }
      return Math.acos(nx1 * nx2 + ny1 * ny2); // dot product
    }
    newPoints = []; // array for new points
    aLen = points.length;
    if (aLen <= 2) {
      // nothing to if line too short
      for (i = 0; i < aLen; i++) {
        // ensure that the points are copied
        newPoints.push([points[i][0], points[i][1]]);
      }
      return newPoints;
    }
    p1 = points[0];
    endP = points[aLen - 1];
    i = 0; // start from second poitn if line not closed
    closed = false;
    len = Math.hypot(p1[0] - endP[0], p1[1] - endP[1]);
    if (len < Math.SQRT2) {
      // end points are the same. Join them in coordinate space
      endP = p1;
      i = 0; // start from first point if line closed
      p1 = points[aLen - 2];
      closed = true;
    }
    newPoints.push([points[i][0], points[i][1]]);
    for (; i < aLen - 1; i++) {
      p2 = points[i];
      p3 = points[i + 1];
      angle = Math.abs(
        dot(p2[0] - p1[0], p2[1] - p1[1], p3[0] - p2[0], p3[1] - p2[1])
      );
      if (dist1 !== 0) {
        // dist1 and dist2 come from dot function
        if (angle < cornerThres * 3.14) {
          // bend it if angle between lines is small
          if (match) {
            dist1 = Math.min(dist1, dist2);
            dist2 = dist1;
          }
          // use the two normalized vectors along the lines to create the tangent vector
          x = (nx1 + nx2) / 2;
          y = (ny1 + ny2) / 2;
          len = Math.sqrt(x * x + y * y); // normalise the tangent
          if (len === 0) {
            newPoints.push([p2[0], p2[1]]);
          } else {
            x /= len;
            y /= len;
            if (newPoints.length > 0) {
              np = newPoints[newPoints.length - 1];
              np.push(p2[0] - x * dist1 * 0.25);
              np.push(p2[1] - y * dist1 * 0.25);
            }
            newPoints.push([
              // create the new point with the new bezier control points.
              p2[0],
              p2[1],
              p2[0] + x * dist2 * 0.25,
              p2[1] + y * dist2 * 0.25,
            ]);
          }
        } else {
          newPoints.push([p2[0], p2[1]]);
        }
      }
      p1 = p2;
    }
    if (closed) {
      // if closed then copy first point to last.
      p1 = [];
      for (i = 0; i < newPoints[0].length; i++) {
        p1.push(newPoints[0][i]);
      }
      newPoints.push(p1);
    } else {
      newPoints.push([
        points[points.length - 1][0],
        points[points.length - 1][1],
      ]);
    }
    return newPoints;
  };
  // --------------------------------------------------------------------------------------------------------------------------