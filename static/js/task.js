/*
 * Requires:
 *     psiturk.js
 *     utils.js
 */

// Initalize psiturk object
var psiTurk = new PsiTurk(uniqueId, adServerLoc, mode);

var mycondition = condition;  // these two variables are passed by the psiturk server process
var mycounterbalance = counterbalance;  // they tell you which condition you have been assigned to
// they are not used in the stroop code but may be useful to you

console.log(mycounterbalance)

// All pages to be loaded
var pages = [
	"instructions/instruct-1.html",
	"testing_interface.html",
	"postquestionnaire.html"
];

psiTurk.preloadPages(pages);

var instructionPages = [ // add as a list as many pages as you like
	"instructions/instruct-1.html",
];

var TASKS_DONE = 0;

const TOTAL_TASKS = 10;

var TRUE_SUMMARY_IS_FIRST;

var CURRENT_PROBLEM_ID = null;

$.ajaxSetup({
    async: false
});


var current_true_sum, current_fake_sum, current_snippet

var problems_all = $.getJSON("/static/experiment/true_vs_false_10_batches_of_10.json");

const problems = problems_all["responseJSON"][mycounterbalance]; // selecting one of 10 subdictionaries

problems_shuffled = _.shuffle(problems) // todo: save problem index to make analysis easier later, instead of directly shuffling the problems?

$.ajaxSetup({
    async: true
});

psiTurk.recordUnstructuredData('problems', problems);
psiTurk.recordUnstructuredData('problems_shuffled', problems_shuffled);
psiTurk.recordUnstructuredData('mycounterbalance', mycounterbalance);

psiTurk.recordUnstructuredData('TOTAL_TASKS', TOTAL_TASKS);

psiTurk.saveData(); // save learning orders and other experiment hyperparameters to the database

/********************
* HTML manipulation
*
* All HTML files in the templates directory are requested 
* from the server when the PsiTurk object is created above. We
* need code to get those pages from the PsiTurk object and 
* insert them into the document.
*
********************/


function saveProlificID() {

	$.ajaxSetup({
    	async: false
	});

	PROLIFICID = $("#prolificid").val()
	psiTurk.recordUnstructuredData("PROLIFIC_ID", $("#prolificid").val());

	$.ajaxSetup({
    	async: true
	});
}

/********************
* STROOP TEST       *
********************/
var ARC_experiment = function() {

    // Load the stage.html snippet into the body of the page
	psiTurk.showPage('testing_interface.html');

    //$("#submit_answer").on("click", mySubmitSolution);

    //$('.testing_interface_body').on('click', "#submit_answer", mySubmitSolution);

	function myRandomTask() {
        phase_to_record = "SummaryClassification";
        TRUE_SUMMARY_IS_FIRST = Math.random() < 0.5;


        current_true_sum = problems_shuffled[TASKS_DONE]["true_sum"];
        current_fake_sum = problems_shuffled[TASKS_DONE]["fake_sum"];
        current_snippet = problems_shuffled[TASKS_DONE]["snippet"];

        $("#evaluation-input-view").show();

        $("#snippet_text").html(current_snippet)

        if (TRUE_SUMMARY_IS_FIRST) {
            $("#summary1").html(current_true_sum);
            $("#summary2").html(current_fake_sum);
        } else {
            $("#summary1").html(current_fake_sum);
            $("#summary2").html(current_true_sum);
        }


        psiTurk.recordTrialData({'phase':phase_to_record,
                                     'trial_type': "problem_presented",
                                     "TRUE_SUMMARY_IS_FIRST": TRUE_SUMMARY_IS_FIRST,
                                     'current_true_sum': current_true_sum,
                                     'current_fake_sum': current_fake_sum,
                                     'current_snippet': current_snippet
                                     }
                                   );
        psiTurk.saveData();
    };

	function mySubmitSolution() {

        var firstSummaryDisplayed = $("#summary1").html() // save for redundancy
        var secondSummaryDisplayed = $("#summary1").html() // save for redundancy
        var firstSummaryAnswer = $("#sum1accurate").find(":selected").val();
        var secondSummaryAnswer = $("#sum2accurate").find(":selected").val();
        var preferredSummaryAnswer = $("#whichmore").find(":selected").val();

        if (firstSummaryAnswer == "No answer" || secondSummaryAnswer == "No answer" || preferredSummaryAnswer == "No answer") {
                $("#expl_warning").show().delay(7000).fadeOut(500);
                //#alert("Please select an answer to each question. Please note that your work will be manually checked. Unrealistically fast submissions and low-effort submissions will be rejected.");
                return
        }

        if (TRUE_SUMMARY_IS_FIRST) {
            evaluatedTrueSummaryAsGood = (firstSummaryAnswer == "Yes" ? 1 : 0)
            evaluatedFalseSummaryAsBad = (secondSummaryAnswer == "No" ? 1 : 0)
            preferredTrueSummary = (preferredSummaryAnswer == "First" ? 1 : 0)
        } else {
            evaluatedTrueSummaryAsGood = (secondSummaryAnswer == "Yes" ? 1 : 0)
            evaluatedFalseSummaryAsBad = (firstSummaryAnswer == "No" ? 1 : 0)
            preferredTrueSummary = (preferredSummaryAnswer == "Second" ? 1 : 0)
        }



        psiTurk.recordTrialData({'phase':phase_to_record,
                                 'trial_type': "answer_given",
                                 'firstSummaryDisplayed': firstSummaryDisplayed,
                                 'secondSummaryDisplayed': secondSummaryDisplayed,
                                 'firstSummaryAnswer': firstSummaryAnswer,
                                 'secondSummaryAnswer': secondSummaryAnswer,
                                 'preferredSummaryAnswer': preferredSummaryAnswer,
                                 "TRUE_SUMMARY_IS_FIRST": TRUE_SUMMARY_IS_FIRST,
                                 'current_true_sum': current_true_sum,
                                 'current_fake_sum': current_fake_sum,
                                 'current_snippet': current_snippet,
                                 'evaluatedFalseSummaryAsBad': evaluatedFalseSummaryAsBad,
                                 "evaluatedTrueSummaryAsGood": evaluatedTrueSummaryAsGood,
                                 "preferredTrueSummary": preferredTrueSummary
                                 }
                               );


		psiTurk.saveData();

		TASKS_DONE = TASKS_DONE + 1;
        next();

	};



	// Stimuli for a basic Stroop experiment

	var next = function() {


        $("#sum1accurate").val("No answer")
        $("#sum2accurate").val("No answer")
        $("#whichmore").val("No answer")
        window.scrollTo(0, 0);
        $("#expl_warning").hide();

        $("#problems_done").html(TASKS_DONE + 1);
        $("#problems_total").html(TOTAL_TASKS);


		if (TASKS_DONE == TOTAL_TASKS) {
			finish();
		}
		else {
			myRandomTask();
		}

	};


	var finish = function() {
	    // unbind stuff$("body").unbind("keydown", response_handler); // Unbind keys
	    currentview = new Questionnaire();
	};

    setTimeout(() =>
	{

		$( () => {

            $("#submit_answer").on("click", mySubmitSolution);

        })
	}, 2)
	// Register the response handler that is defined above to handle any
	// key down events.
	//$("body").focus().keydown(response_handler);

	// Start the test
	next();


};


/****************
* Questionnaire *
****************/

var Questionnaire = function() {

	var error_message = "<h1>Oops!</h1><p>Something went wrong submitting your HIT. This might happen if you lose your internet connection. Press the button to resubmit.</p><button id='resubmit'>Resubmit</button>";

	record_responses = function() {

		psiTurk.recordTrialData({'phase':'postquestionnaire', 'status':'submit'});

		$('textarea').each( function(i, val) {
			psiTurk.recordUnstructuredData(this.id, this.value);
		});
		$('select').each( function(i, val) {
			psiTurk.recordUnstructuredData(this.id, this.value);		
		});

	};

	prompt_resubmit = function() {
		document.body.innerHTML = error_message;
		$("#resubmit").click(resubmit);
	};

	resubmit = function() {
		document.body.innerHTML = "<h1>Trying to resubmit...</h1>";
		reprompt = setTimeout(prompt_resubmit, 10000);
		
		psiTurk.saveData({
			success: function() {
			    clearInterval(reprompt); 
                psiTurk.computeBonus('compute_bonus', function(){
                	psiTurk.completeHIT(); // when finished saving compute bonus, the quit
                }); 


			}, 
			error: prompt_resubmit
		});
	};

	// Load the questionnaire snippet 
	psiTurk.showPage('postquestionnaire.html');
	psiTurk.recordTrialData({'phase':'postquestionnaire', 'status':'begin'});
	
	$("#next").click(function () {
	    record_responses();
	    psiTurk.saveData({
            success: function(){
                psiTurk.computeBonus('compute_bonus', function() { 
                	psiTurk.completeHIT(); // when finished saving compute bonus, the quit
                });
            }, 
            error: prompt_resubmit});
	});


};

// Task object to keep track of the current phase
var currentview;

/*******************
 * Run Task
 ******************/
$(window).load( function(){
    psiTurk.doInstructions(
    	instructionPages, // a list of pages you want to display in sequence
    	function() { currentview = new ARC_experiment(); } // what you want to do when you are done with instructions
    );
});
