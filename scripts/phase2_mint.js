/**
 * Phase 2 - Evaluation & Certification Model
 * --------------------------------------------
 * Reads data/submissions.json (mock LMS export: performance submissions +
 * expert evaluation marks/grade/parameters/comments). For every submission
 * whose evaluation.status === "Completed" and certificateStatus !== "Issued",
 * mints an EVALUATION-kind soulbound certificate and generates metadata
 * containing everything the spec requires:
 *   Participant Name, Event Name, Evaluator Name, Marks & Grade,
 *   Evaluation Parameters, Comments, Audio Feedback URL, Transaction Hash.
 *
 * Run: npx hardhat run scripts/phase2_mint.js --no-compile --network localhost
 */
const path = require("path");
const hre = require("hardhat");
const {
  getContract,
  buildVerificationLink,
  ensureDirs,
  readJson,
  writeJson,
  METADATA_DIR,
} = require("./lib/common");

const SUBMISSIONS_PATH = path.join(__dirname, "..", "data", "submissions.json");

async function main() {
  ensureDirs();
  const { contract, deployment } = await getContract();
  const submissions = readJson(SUBMISSIONS_PATH);

  let mintedCount = 0;

  for (const s of submissions) {
    const alreadyIssued = s.certificateStatus === "Issued";
    const eligible = s.evaluation.status === "Completed" && !alreadyIssued;

    if (!eligible) {
      console.log(
        `SKIP  ${s.id} (${s.participantName}) - evaluation.status=${s.evaluation.status}, certificateStatus=${s.certificateStatus}`
      );
      continue;
    }

    console.log(`MINT  ${s.id} (${s.participantName}) - evaluation complete -> issuing graded certificate...`);

    // Kind 1 = EVALUATION (see CertificateSBT.CertKind enum)
    const tx = await contract.issueCertificate(
  s.walletAddress,
  1,
  s.participantName,
  s.eventName,
  "",
  { gasLimit: 350000 }
);
    const receipt = await tx.wait();

    const parsedLogs = receipt.logs.map((log) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return null;
      }
    });
    const event = parsedLogs.find((e) => e && e.name === "CertificateIssued");
    if (!event) throw new Error("CertificateIssued event not found in transaction receipt");

    const tokenId = event.args.tokenId.toString();
    const verificationLink = buildVerificationLink(hre.network.name, tx.hash, tokenId);

    const metadata = {
      name: `Evaluation Certificate - ${s.eventName}`,
      description: `This certifies that ${s.participantName} was evaluated in "${s.eventName}" and awarded grade ${s.evaluation.grade} (${s.evaluation.totalMarks}/${s.evaluation.maxMarks}).`,
      image: "https://assets.example.org/certificates/evaluation-template.png",
      external_url: verificationLink,
      attributes: [
        { trait_type: "Certificate Type", value: "Evaluation" },
        { trait_type: "Participant Name", value: s.participantName },
        { trait_type: "Event Name", value: s.eventName },
        { trait_type: "Workshop By", value: s.workshopBy || "Dr. Urvashi Mohinani" },
        { trait_type: "Evaluator Name", value: s.evaluation.evaluatorName },
        { trait_type: "Grade", value: s.evaluation.grade },
        { trait_type: "Total Marks", value: `${s.evaluation.totalMarks}/${s.evaluation.maxMarks}` },
        { trait_type: "Tamper Proof", value: "true" },
        { trait_type: "Verification Link", value: verificationLink },
      ],
      participant: {
        name: s.participantName,
        walletAddress: s.walletAddress,
      },
      workshopBy: s.workshopBy || "Dr. Urvashi Mohinani",
      evaluatorName: s.evaluation.evaluatorName,
      marksAndGrade: {
        totalMarks: s.evaluation.totalMarks,
        maxMarks: s.evaluation.maxMarks,
        grade: s.evaluation.grade,
      },
      evaluationParameters: s.evaluation.parameters,
      comments: s.evaluation.comments,
      audioFeedbackUrl: s.audioFeedbackUrl,
      performanceSubmissionUrl: s.mediaUrl,
      tokenId,
      contractAddress: deployment.address,
      network: hre.network.name,
      transactionHash: tx.hash,
      issuedAt: new Date().toISOString(),
    };

    const metadataFile = path.join(METADATA_DIR, `evaluation-${s.id}-token${tokenId}.json`);
    writeJson(metadataFile, metadata);

    s.certificateStatus = "Issued";
    s.tokenId = tokenId;
    s.txHash = tx.hash;
    s.verificationLink = verificationLink;
    s.metadataFile = path.relative(path.join(__dirname, ".."), metadataFile);

    mintedCount++;
    console.log(`      -> tokenId=${tokenId}, tx=${tx.hash}, grade=${s.evaluation.grade}`);
    console.log(`      -> metadata: ${metadataFile}`);
    console.log(`      -> verify:   ${verificationLink}`);
  }

  writeJson(SUBMISSIONS_PATH, submissions);
  console.log(`\nDone. ${mintedCount} certificate(s) minted. submissions.json updated.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
