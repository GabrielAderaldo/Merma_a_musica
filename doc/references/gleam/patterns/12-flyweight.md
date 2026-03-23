# Episode 12: Flyweight

Episode 12: Flyweight
Administrators of the lawyer firm Cristopher, Matton & Pharts detected that reporting system
consumes a lot of memory and garbage collector continiously hangs system for seconds. Fix that.
Pedro: I’ve seen this issue before.
Eve: What’s wrong?
Pedro: They have realtime charts with a lot of different points. It’s a huge amount of memory.
As a result garbage collector stops the system.
Eve: Hmmm, what we can do?
Pedro: Not much, caching does not help us because points are…
Eve: Wait!
Pedro: What?
Eve: They use age values for points, why not precompute these points for most common ages?
Say for age [0, 100]
Pedro: You mean use Flyweight pattern?
Eve: I mean reuse objects.
class Point {
int x;
int y;
/* some other properties*/
// precompute 10000 point values at class loading time
private static Point[][] CACHED;
static {
CACHED = new Point[100][];
for (int i = 0; i < 100; i++) {
CACHED[i] = new Point[100];
for (int j = 0; j < 100; j++) {
CACHED[i][j] = new Point(i, j);
}
}
}
Point(int x, int y) {
this.x = x;
this.y = y;
}
static Point makePoint(int x, int y) {
if (x >= 0 && x < 100 &&
y >= 0 && y < 100) {
return CACHED[x][y];
} else {
return new Point(x, y);
}
}
}
Pedro: For this pattern we need two things: precompute most used points at a startup time, and
use static factory method instead of constructor to return cached object.
Eve: Have you tested it?
Pedro: Sure, the system works like a clock.
Eve: Excellent, here is my version
(defn make-point [x y]
[x y {:some "Important Properties"}])
(def CACHE
(let [cache-keys (for [i (range 100) j (range 100)] [i j])]
(zipmap cache-keys (map #(apply make-point %) cache-keys))))
(defn make-point-cached [x y]
(let [result (get CACHE [x y])]
(if result
result
(make-point x y))))
Eve: It creates a flat map with pair [x, y] as a key, instead of two-dimensional array.
Pedro: Pretty the same.
Eve: No, it is much flexible, you can’t use two-dimensional array if you need to cache three
points or non-integer values.
Pedro: Oh, got it.
Eve: Even better, in clojure you can just use memoize function to cache calls to factory
function make-point
(def make-point-memoize (memoize make-point))
Eve: Every call (except first one) with the same parameters return cached value.
Pedro: That’s awesome!
Eve: Of course, but remember if your function has side-effects, memoization is bad idea.
