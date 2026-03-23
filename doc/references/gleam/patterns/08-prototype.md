# Episode 8: Prototype

Episode 8: Prototype
Dex Ringeus detected that users feel uncomfortable with registration form. Make it more usable.
Pedro: So, what’s the problem with the registration?
Eve: There are lot of fields users bored to type in.
Pedro: For example?
Eve: For example, weight. Having such field scares 90% of female users.
Pedro: But this field is important for our analytics system, we make food and clothes
recomendations based on that field.
Eve: Then, make it optional, and if it is not provided, take some default value.
Pedro: 60 kg is ok?
Eve: I think so.
Pedro: Ok, give me two minutes.
2 hours later
Pedro: I suggest to use some registration prototype which has all fields are filled with default
values. After user completes the form we modify filled values.
Eve: Sounds great.
Pedro: Here it is our standard registration form, with prototype in clone() method.
public class RegistrationForm implements Cloneable {
private String name = "Zed";
private String email = "zzzed@gmail.com";
private Date dateOfBirth = new Date(1970, 1, 1);
private int weight = 60;
private Gender gender = Gender.MALE;
private Status status = Status.SINGLE;
private List<Child> children = Arrays.asList(new Child(Gender.FEMALE));
private double monthSalary = 1000;
private List<Brand> favouriteBrands = Arrays.asList("Adidas", "GAP");
// few hundreds more properties
@Override
protected RegistrationForm clone() throws CloneNotSupportedException {
RegistrationForm prototyped = new RegistrationForm();
prototyped.name = name;
prototyped.email = email;
prototyped.dateOfBirth = (Date)dateOfBirth.clone();
prototyped.weight = weight;
prototyped.status = status;
List<Child> childrenCopy = new ArrayList<Child>();
for (Child c : children) {
childrenCopy.add(c.clone());
}
prototyped.children = childrenCopy;
prototyped.monthSalary = monthSalary;
List<String> brandsCopy = new ArrayList<String>();
for (String s : favouriteBrands) {
brandsCopy.add(s);
}
prototyped.favouriteBrands = brandsCopy;
return prototyped;
}
}
Pedro: Every time we create a user, call clone() and then override needed properties.
Eve: Awful! In mutable world clone() is needed to create new object with the same
properties. The hard part is the copy must be deep, i.e. instead of copying reference you need
recursively clone() other objects, and what if one of them doesn’t have clone()…
Pedro: That’s the problem and this pattern solves it.
Eve: I don’t think it is a solution if you need to implement clone every time you adding new
object.
Pedro: How clojure avoid this?
Eve: Clojure has immutable data structures. That’s all.
Pedro: How does it solve prototype problem?
Eve: Every time you modify object, you get a fresh new immutable copy of your data, and old
one is not changed. Prototype is not needed in immutable world
(def registration-prototype
{:name "Zed"
:email "zzzed@gmail.com"
:date-of-birth "1970-01-01"
:weight 60
:gender :male
:status :single
:children [{:gender :female}]
:month-salary 1000
:brands ["Adidas" "GAP"]})
;; return new object
(assoc registration-prototype
:name "Mia Vallace"
:email "tomato@gmail.com"
:weight 52
:gender :female
:month-salary 0)
Pedro: Great! But how this affects performance?
Copying million rows each time you adding new value seems time consuming operation.
Eve: No, it is not. Go to Google and search for persistent data structures and structural sharing
Pedro: Thanks a lot.
