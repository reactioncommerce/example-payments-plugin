export default function (deps) {
  const { Meteor, check, Match, Reaction } = deps;



  const { createJobClass } = require("../common/jobFactory");
  const { createJobCollectionBaseClass } = require("../common/jobCollectionBaseFactory");
  const { createJobCollectionClass } = require("./jobCollectionFactory");

  // Create classes through dependency injecting
  const Job = createJobClass({ Meteor });
  const JobCollectionBaseClass = createJobCollectionBaseClass({ Meteor, Mongo, check, Match, later, Job });
  const JobCollection = createJobCollectionClass({ ...deps, Job, JobCollectionBaseClass });

  return {
    methods,
    translations: require("./i18n")
  };
}
