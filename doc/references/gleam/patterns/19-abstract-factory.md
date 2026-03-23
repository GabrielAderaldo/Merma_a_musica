# Episode 19: Abstract Factory

Episode 19: Abstract Factory
Users are not buying new levels in the game. Saimank Gerr build a complains cloud and the most
popular negative feedback words are: “ugly”, “crap” and “shit”.
Improve levels-building system.
Pedro: I said this is crap.
Eve: Sure, snow background with wooden walls, space invaders with wooden walls every
setting with wooden walls.
Pedro: Then we must separate game worlds and build a set of specific objects for particular
world.
Eve: Explain.
Pedro: Instead of using Factory Method for building specific blocks, we use Abstract Factory to
build a set of related objects, to make a level look less crappy.
Eve: Example would be good.
Pedro: Code is my example. First we define abstract behaviour of level factory
public interface LevelFactory {
Wall buildWall();
Back buildBack();
Enemy buildEnemy();
}
Pedro: Then we have a hierarchy of objects that level consists of
class Wall {}
class PlasmaWall extends Wall {}
class StoneWall extends Wall {}
class Back {}
class StarsBack extends Back {}
class EarthBack extends Back {}
class Enemy {}
class UFOSoldier extends Enemy {}
class WormScout extends Enemy {}
Pedro: See? We have a specific object for each level, let’s create factory for them.
class SpaceLevelFactory implements LevelFactory {
@Override
public Wall buildWall() {
return new PlasmaWall();
}
@Override
public Back buildBack() {
return new StarsBack();
}
@Override
public Enemy buildEnemy() {
return new UFOSoldier();
}
}
class UndergroundLevelFactory implements LevelFactory {
@Override
public Wall buildWall() {
return new StoneWall();
}
@Override
public Back buildBack() {
return new EarthBack();
}
@Override
public Enemy buildEnemy() {
return new WormScout();
}
}
Pedro: Each implementation of level factory creates related objects for level. Levels will look
less crappy for sure.
Eve: Let me understand. I really can’t spot the difference.
Pedro: Factory Method defers object creation to a subclasses, Abstract Factory do the same but
for a set of related object.
Eve: Aha, that means I need to pass set of related functions to abstract builder
(defn level-factory [wall-fn back-fn enemy-fn])
(defn make-stone-wall [])
(defn make-plasma-wall [])
(defn make-earth-back [])
(defn make-stars-back [])
(defn make-worm-scout [])
(defn make-ufo-soldier [])
(def underground-level-factory
(partial level-factory
make-stone-wall
make-earth-back
make-worm-scout))
(def space-level-factory
(partial level-factory
make-plasma-wall
make-stars-back
make-ufo-soldier))
Pedro: I knew.
Eve: Everything is fair. Your lovely “set of related Xs”, where X is a function
Pedro: Yes, clarify, what partial is.
Eve: Provide some parameters for function. So, underground-level-factory knows
how to construct walls, backs and enemies. Everything other inherited from abstract level-
factory function.
Pedro: Handy.
