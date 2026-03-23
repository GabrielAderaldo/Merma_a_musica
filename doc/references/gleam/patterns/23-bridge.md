# Episode 23: Bridge

Episode 23: Bridge
Girls from HR agency “Hurece’s Sour Man” trying to identify candidates to their open job positions.
The problem is jobs often created by customers, but requirements to the jobs are developed by HR.
Provide them with a flexible way of collaborating.
Eve: I don’t understand the problem.
Pedro: I have a bit of background. They have a very strange system which defines job
requirements as an interface.
interface JobRequirement {
boolean accept(Candidate c);
}
Pedro: Every specific requirement implemented as a new subclass of this.
class JavaRequirement implements JobRequirement {
public boolean accept(Candidate c) {
return c.hasSkill("Java");
}
}
class Experience10YearsRequirement implements JobRequirement {
public boolean accept(Candidate c) {
return c.getExperience() >= 10;
}
}
Eve: I’ve got an idea.
Pedro: Take into account, this requirement hierarchy is designed by HR Department.
Eve: Ok.
Pedro: And they have a Job hierarchy, where each specific job is subclass as well.
Eve: Why do they need a class for each job? It should be an object.
Pedro: The system was designed when classes were more popular than objects, so live with this.
Eve: Class were popular than objects?!
Pedro: Yes, listen and don’t interrupt me. Jobs with requirements is completely separate
hierarchy, and it is developed by customers. We introduce pattern Bridge to separate these two
hierarchies and allow them live independently.
abstract class Job {
protected List<? extends JobRequirement> requirements;
public Job(List<? extends JobRequirement> requirements) {
this.requirements = requirements;
}
protected boolean accept(Candidate c) {
for (JobRequirement j : requirements) {
if (!j.accept(c)) {
return false;
}
}
return true;
}
}
class CognitectClojureDeveloper extends Job {
public CognitectClojureDeveloper() {
super(Arrays.asList(
new ClojureJobRequirement(),
new Experience10YearsRequirement()
));
}
}
Eve: So where is the bridge?
Pedro: JobRequirement, JavaRequirement, ExperienceRequirement is one
hierarchy, yes?
Eve: Yes.
Pedro: Job, CongnitectClojureDeveloperJob, OracleJavaDeveloperJob is
another hierarchy.
Eve: Oh, now I see. A link from Job to JobRequirement is a bridge.
Pedro: Exactly! This is how HR can use this system to find candidate matches.
Candidate joshuaBloch = new Candidate();
(new CognitectClojureDeveloper()).accept(joshuaBloch);
(new OracleSeniorJavaDeveloper()).accept(joshuaBloch);
Pedro: Here is the point. Customers use Job as abstraction and JobRequirement as an
implementation. They just create a job with descriptions or so, and HR is responsible to convert
these descriptions into specific set of JobRequirement objects.
Eve: Got it.
Pedro: So as far as I understand, clojure could mimic this pattern by using defprotocol and
defrecord?
Eve: Yes, but I want to revisit the problem.
Pedro: What’s wrong?
Eve: Here is we have a static flow: customer create job positions, human resources convert job
position to a set of requirements and run a script against their candidates database to find a
matches.
Pedro: Correct.
Eve: So there is already dependency, HR can’t do anything without open job positions.
Pedro: Well, yes. But they can develop a set of structured requirements without knowing what
open positions might be.
Eve: For what purpose?
Pedro: Later this can be reused by Job creators, so HR avoid doing the same work twice.
Eve: Okay, got it, but this problem is artificial. Basically what we need is a way to colaborate
between abstraction and implementation.
Pedro: Maybe, but I want to see your clojure way solution for that specific problem using bridge
pattern.
Eve: Easy. Let’s use adhoc hierarchies.
Pedro: For abstractions?
Eve: Yes, jobs hierarchy is abstraction, and people need just to enhance hierarchy.
;; abstraction
(derive ::clojure-job ::job)
(derive ::java-job ::job)
(derive ::senior-clojure-job ::clojure-job)
(derive ::senior-java-job ::java-job)
Eve: HR department are like developers, they provide implementation for this abstraction.
;; implementation
(defmulti accept :job)
(defmethod accept :java [candidate]
(and (some #{:java} (:skills candidate))
(> (:experience candidate) 1)))
Eve: Later, when new jobs are created, but requirements are not yet developed and no accept
method implementation for this type of job, we fallback using adhoc hierarchy.
Pedro: Hm?
Eve: Assume someone created a new ::senior-java as a child of ::java job.
Pedro: Oh, and if HR not provided accept implementation for dispatch value ::senior-
java, method with dispatch value ::java will be called, yes?
Eve: You learning so fast.
Pedro: But is it real bridge pattern?
Eve: There is no bridge here, but abstraction and implementation can live independently.
The End.
