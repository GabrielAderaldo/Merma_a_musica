# Episode 17: Composite

Episode 17: Composite
Actress Bella Hock don’t see user avatars in our social network on her computer.
“Everything is black. Is it black holes?”
Pedro: It is black squares.
Eve: Hmm, the same problem on our side.
Pedro: Seems, that latest feature broke user avatars.
Eve: Strange, because avatars rendered the same way as other elements, but they are visible.
Pedro: Are you sure it rendered the same way?
Eve: Well…no
Digging code
Pedro: What the hell is going on here?
Eve: Someone copypasted code, but forgot to reflect changes in avatars.
Pedro: Let’s blame him, git-blame
Eve: Blame is good, but we need to fix the problem
Pedro: It’s simple just additional line here.
Eve: I mean, really solve the problem. Why do we need two similar snippets of code to process
the same blocks?
Pedro: Correct, I think we could use Composite pattern to handle rendering of the whole page.
Our smallest element to render is block.
public interface Block {
void addBlock(Block b);
List<Block> getChildren();
void render();
}
Pedro: Obviously blocks may contain other blocks, that’s the point of Composite pattern. We
may create some specific blocks.
public class Page implements Block { }
public class Header implements Block { }
public class Body implements Block { }
public class HeaderTitle implements Block { }
public class UserAvatar implements Block { }
Pedro: And treat every specific element as a Block
Block page = new Page();
Block header = new Header();
Block body = new Body();
Block title = new HeaderTitle();
Block avatar = new UserAvatar();
page.addBlock(header);
page.addBlock(body);
header.addBlock(title);
header.addBlock(avatar);
page.render();
Pedro: This is a structural pattern, a good way to compose objects. That’s why it is called
composite
Eve: Hey, composite is a simple tree structure.
Pedro: Yes.
Eve: There is pattern for every datastructure?
Pedro: No, just for list and tree.
Eve: Actually, tree can be represented as a list
Pedro: How?
Eve: First element of a list is a node value, next elements are children, each of them is…
Pedro: I understand.
Eve: To be specific, here is the tree
A
/ | \
B C D
| | / \
E H J K
/ \ /|\
F G L M N
Eve: And here is the list represents this tree
(def tree
'(A (B (E (F) (G))) (C (H)) (D (J) (K (L) (M) (N)))))
Pedro: It’s a plenty of parentheses!
Eve: They define structure, you know
Pedro: But it’s hard to understand
Eve: It’s easy for machine, there is awesome tree-seq function to process the tree.
(map first (tree-seq next rest tree)) => (A B E F G C H D J K L M N)
Eve: If you need more advanced traversals, use clojure.walk
Pedro: I don’t know, everything seems just a bit harder.
Eve: No, you define the whole tree with one datastructure and use one function to operate on it.
Pedro: What this function will do?
Eve: It traverses the tree and applies to every node, so in our case it can render each component.
Pedro: I don’t know, maybe I am too young for the trees, let’s move forward.
