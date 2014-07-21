module("ActionQueue");

test("construct", function () {
    var q = new ActionQueue();

    ok(q instanceof ActionQueue);
});

test("queue action (not in action)", function () {
    var q = new ActionQueue(), actionDone = false;

    q.queueNext(function () {
        actionDone = true;
        q.finishAction();
    });

    ok(actionDone);
});

test("queue action (in action)", function () {
    var q = new ActionQueue();

    function toQ() { q.finishAction(); };

    q._isInAction = true;
    q.queueNext(toQ);

    deepEqual(
        q._queueStack,
        [
            [
                [ toQ ]
            ]
        ]
    );
});

test("queue action (named function with args)", function () {
    var q = new ActionQueue(), toSet = "arghh";

    function toQ(arg) {
        toSet = arg;
        q.finishAction();
    };

    q.queueNext(toQ, "Hello, world!");

    equal(toSet, "Hello, world!");
});

asyncTest("queue action (within queued action)", function () {
    expect(6);

    var q = new ActionQueue(), steps = 0;

    q._isInAction = true;

    q.queueNext(function () {
        equal(steps++, 0);

        q.queueNext(function () {
            equal(steps++, 1);

            q.queueNext(function () {
                equal(steps++, 2);
                setTimeout(function () { q.finishAction(); }, 50);
            });

            setTimeout(function () { q.finishAction(); }, 10);
        });

        q.finishAction();
    }).queueNext(function () {
        equal(steps++, 3);

        q.queueNext(function () {
            equal(steps++, 4);

            q.finishAction();
        });

        q.finishAction();
    }).queueNext(function () {
        equal(steps++, 5);

        q.finishAction();
        start();
    });

    q.finishAction();
});

asyncTest(
    "queue an action while an executing action is waiting for async response",
    function () {
        expect(7);

        var q = new ActionQueue(), steps = 0;

        q.queueNext(function () {
            equal(steps++, 0, "first step");

            q.beginAsynchronous();
            setTimeout(function () {
                equal(steps++, 1, "second step");

                q.finishAsynchronous();
                q.finishAction();
            }, 100);
        });

        setTimeout(function () {
            equal(steps++, 3, "fourth step");

            q.queueNext(function () {
                equal(steps++, 6, "seventh step");
                q.finishAction();
                start();
            });
        }, 200);

        q.queueNext(function () {
            equal(steps++, 2, "third step");

            q.beginAsynchronous();
            setTimeout(function () {
                equal(steps++, 4, "fifth step");

                q.finishAsynchronous();
                q.finishAction();
            }, 400);
        }).queueNext(function () {
            equal(steps++, 5, "sixth step");
            q.finishAction();
        });
    }
);


asyncTest(
    "queue an action while executing action awaits async reponse works on stack index > 1",
    function () {
        expect(9);

        var q = new ActionQueue(), steps = 1;

        function one(step) {
            q.queueNext(function () {
                equal(steps++, step, "step " + step);

                q.beginAsynchronous();
                setTimeout(function () {
                    q.finishAsynchronous();
                    q.finishAction();
                }, 100);
            });
        }

        function two(step) {
            q.queueNext(function () {
                equal(steps++, step, "step " + step);

                if (step == 2) three();
                q.finishAction();

                if (step == 9) start();
            });
        }

        function three() {
            q.queueNext(function () {
                equal(steps++, 3, "step 3");

                q.beginAsynchronous();
                setTimeout(function () {
                    equal(steps++, 5, "step 5");

                    q.finishAsynchronous();
                    q.finishAction();
                }, 300);
            });
        }

        one(1);
        two(2);
        one(6);
        two(7);

        setTimeout(function () {
            equal(steps++, 4, "step 4");

            one(8);
            two(9);
        }, 200);
    }
);

test("finish action", function () {
    var q = new ActionQueue(),
        action1Done = false, action2Done = false;

    function toQ1() {
        action1Done = true;
        q.finishAction();
    }
    function toQ2() {
        action2Done = true;
        q.finishAction();
    }

    q._isInAction = true;

    q.queueNext(toQ1).queueNext(toQ2).finishAction();

    ok(action1Done);
    ok(action2Done);
});

test("do not allow any more inputs after action queue is disposed", function () {
    var q = new ActionQueue(),
        action1Done = false, action2Done = false;

    function toQ1() {
        action1Done= true;
        q.finishAction();
    }
    function toQ2() {
        action2Done = true;
        q.finishAction();
    }

    q._isInAction = true;

    q.queueNext(toQ1)
     .finish()
     .queueNext(toQ2)
     .finishAction();

    ok(action1Done);
    ok(!action2Done);
});
