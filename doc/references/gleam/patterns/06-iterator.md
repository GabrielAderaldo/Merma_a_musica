# Episode 6: Iterator

Episode 6. Iterator
Technical consultant Kent Podiololis complains for C-style loops usage.
“Are we in 1980 or what?” – Kent
Pedro: We definitely should use pattern Iterator from java.
Eve: Don’t be fool, nobody’s using java.util.Iterator
Pedro: Everybody use it implicitly in for-each loop. It’s a good way to traverse a container.
Eve: What does it mean “to traverse a container”?
Pedro: Formally, the container should provide two methods for you:
next() to return next element and hasNext() to return true if container has more elements.
Eve: Ok. Do you know what linked list is?
Pedro: Singly linked list?
Eve: Singly linked list.
Pedro: Sure. It is a container consists of nodes. Each node has a data value and reference to the
next node. And null value if there is no next node.
Eve: Correct. Now tell me how traversing such list is differ from traversing via iterator?
Pedro: Emmm…
Pedro wrote two traversing snippets:
Traversing using iterator
Iterator i;
while (i.hasNext()) {
i.next();
}
Traversing using linked list
Node next = root;
while (next != null) {
next = next.next;
}
Pedro: They are pretty similar…What is analogue of Iterator in clojure?
Eve: seq function.
(seq [1 2 3]) => (1 2 3)
(seq (list 4 5 6)) => (4 5 6)
(seq #{7 8 9}) => (7 8 9)
(seq (int-array 3)) => (0 0 0)
(seq "abc") => (\a \b \c)
Pedro: It returns a list…
Eve: Sequence, because Iterator is just a sequence
Pedro: Is it possible to make seq works on custom datastructures?
Eve: Implement clojure.lang.Seqable interface
(deftype RedGreenBlackTree [& elems]
clojure.lang.Seqable
(seq [self]
;; traverse element in needed order
))
Pedro: Fine then. But I’ve heard iterator is often used to achive laziness, for example to
calculate value only during getNext() call, how list handle that?
Eve: List can be lazy as well, clojure calls such list “lazy sequence”.
(def natural-numbers (iterate inc 1))
Eve: We defined thing to represent ALL natural numbers, but we haven’t got OutOfMemory
yet, because we haven’t requested any value. It’s lazy.
Pedro: Could you explain more?
Eve: Unfortunately, I am too lazy for that.
Pedro: I will remember that!
