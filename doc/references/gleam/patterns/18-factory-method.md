# Episode 18: Factory Method

Episode 18. Factory Method
Sir Dry Bang suggest to create new levels for their popular game. More levels - more money.
Pedro: How can we create new levels?
Eve: Just change assets and add new blocks: paper, wood, iron…
Pedro: It’s too silly, isn’t it?
Eve: The whole game is too silly. If user pay for color hats for their characters, then they will
pay for wooden blocks as well.
Pedro: I think it’s a crap, but anyway, let’s make MazeBuilder generic and add specific
builder for each type of the block. It’s a Factory Method pattern.
class Maze { }
class WoodMaze extends Maze { }
class IronMaze extends Maze { }
interface MazeBuilder {
Maze build();
}
class WoodMazeBuilder {
@Override
Maze build() {
return new WoodMaze();
}
}
class IronMazeBuilder {
@Override
Maze build() {
return new IronMaze();
}
}
Eve: Isn’t it obvious that IronMazeBuilder will return IronMazes?
Pedro: Not for program. But see, to make a maze from another blocks we just change
implementation responsible for block creation.
MazeBuilder builder = new WoodMazeBuilder();
Maze maze = builder.build();
Eve: I’ve seen something similar before.
Pedro: What exactly?
Eve: For me it seems like a strategy or state pattern.
Pedro: No way! Strategy is about performing specific operations and factory is for creating
specific object.
Eve: But create is an operation as well.
(defn maze-builder [maze-fn])
(defn make-wood-maze [])
(defn make-iron-maze [])
(def wood-maze-builder (partial maze-builder make-wood-maze))
(def iron-maze-builder (partial maze-builder make-iron-maze))
Pedro: Hm, seems similar.
Eve: Think about it.
Pedro: Any usage examples?
Eve: No, everything is obvious here, just re-read Strategy, State or TemplateMethod episodes.
