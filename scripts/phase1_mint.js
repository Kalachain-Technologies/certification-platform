/**
 * Phase 1 - Workshop Participation Model
 * ---------------------------------------
 * Simulates the "Approval Workflow -> Blockchain Certificate Minting" step.
 *
 * Reads data/participants.json (stand-in for the Google Sheet / DB the admin
 * uses for manual payment verification + approval). For every participant
 * whose approvalStatus === "Approved" and certificateStatus !== "Issued",
 * this script automatically:
 *   1. Mints a soulbound PARTICIPATION certificate on-chain (CertificateSBT).
 *   2. Generates ERC-721 style JSON metadata with a verification link.
 *   3. Updates the participant record: certificateStatus -> "Issued",
 *      tokenId, txHash, verificationLink.
 *   4. Leaves emailStatus untouched ("Pending") -- delivery is a SEPARATE,
 *      manually-triggered step (see scripts/phase1_email.js), per the
 *      requirement that certificate issuance is automatic but email
 *      delivery is triggered manually after the workshop.
 *
 * Run: npx hardhat run scripts/phase1_mint.js --no-compile
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

const PARTICIPANTS_PATH = path.join(__dirname, "..", "data", "participants.json");

async function main() {
  ensureDirs();
  const { contract, deployment } = await getContract();
  const participants = readJson(PARTICIPANTS_PATH);

  let mintedCount = 0;

  for (const p of participants) {
    const alreadyIssued = p.certificateStatus === "Issued";
    const eligible = p.approvalStatus === "Approved" && !alreadyIssued;

    if (!eligible) {
      console.log(
        `SKIP  ${p.id} (${p.name}) - approvalStatus=${p.approvalStatus}, certificateStatus=${p.certificateStatus}`
      );
      continue;
    }

    console.log(`MINT  ${p.id} (${p.name}) - approvalStatus=Approved -> issuing certificate...`);

    // Kind 0 = PARTICIPATION (see CertificateSBT.CertKind enum)
   const tx = await contract.issueCertificate(
  p.walletAddress,
  0,
  p.name,
  p.workshopName,
  "", // metadataURI patched in after we know the tokenId
  { gasLimit: 350000 }
);
    const receipt = await tx.wait();

    const parsedLogs = receipt.logs.map((log) => {
      try {
        return contract.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    });
    const event = parsedLogs.find((e) => e && e.name === "CertificateIssued");

    if (!event) {
      console.error("Parsed logs:", parsedLogs);
      console.error("Raw logs:", receipt.logs);
      throw new Error("CertificateIssued event not found in transaction receipt");
    }

    const tokenId = event.args.tokenId.toString();
    const verificationLink = buildVerificationLink(hre.network.name, tx.hash, tokenId);

    // Build & persist metadata (ERC-721 metadata standard + program-specific fields)
    const metadata = {
      name: `Participation Certificate - ${p.workshopName}`,
      description: `This certifies that ${p.name} participated in "${p.workshopName}" held on ${p.workshopDate}.`,
      image: "https://assets.example.org/certificates/participation-template.png",
      external_url: verificationLink,
      attributes: [
        { trait_type: "Certificate Type", value: "Participation" },
        { trait_type: "Participant Name", value: p.name },
        { trait_type: "Workshop", value: p.workshopName },
        { trait_type: "Workshop By", value: p.workshopBy || "Dr. Urvashi Mohinani" },
        { trait_type: "Workshop Date", value: p.workshopDate },
        { trait_type: "Tamper Proof", value: "true" },
        { trait_type: "Verification Link", value: verificationLink },
      ],
      participant: {
        name: p.name,
        email: p.email,
        walletAddress: p.walletAddress,
      },
      workshopBy: p.workshopBy || "Dr. Urvashi Mohinani",
      tokenId,
      contractAddress: deployment.address,
      network: hre.network.name,
      transactionHash: tx.hash,
      issuedAt: new Date().toISOString(),
    };

    const metadataFile = path.join(METADATA_DIR, `participation-${p.id}-token${tokenId}.json`);
    writeJson(metadataFile, metadata);

    // Patch on-chain metadataURI reference (in production this would be an
    // ipfs:// or https:// URI hosted before minting; here we record the
    // local path since we mint and generate metadata together for the demo).
    p.certificateStatus = "Issued";
    p.tokenId = tokenId;
    p.txHash = tx.hash;
    p.verificationLink = verificationLink;
    p.metadataFile = path.relative(path.join(__dirname, ".."), metadataFile);
    // emailStatus intentionally left as-is ("Pending") - manual trigger required

    mintedCount++;
    console.log(`      -> tokenId=${tokenId}, tx=${tx.hash}`);
    console.log(`      -> metadata: ${metadataFile}`);
    console.log(`      -> verify:   ${verificationLink}`);
  }

  writeJson(PARTICIPANTS_PATH, participants);
  console.log(`\nDone. ${mintedCount} certificate(s) minted. participants.json updated.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
