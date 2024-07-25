import React, { useEffect, useState } from "react";
import {
  hubspot,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Statistics,
  StatisticsItem,
} from "@hubspot/ui-extensions";

// Define the extension to be run within the Hubspot CRM
hubspot.extend(({ context, runServerlessFunction }) => (
  <Extension context={context} runServerless={runServerlessFunction} />
));

// Define the Extension component, taking in runServerless, context, & sendAlert as props
const Extension = ({ context, runServerless }) => {
  const [events, setEvents] = useState([]);

  useEffect(async () => {
    const { response } = await runServerless({
      name: "myFunc",
      parameters: { hs_object_id: context.crm.objectId },
    });
    setEvents(response);
  }, []);

  return (
    <>
      <Statistics>
        <StatisticsItem label="TempAIture" number="view" />
        <StatisticsItem label="Multi-area temperature" number="activate" />
        <StatisticsItem label="Multi-area temperature" number="view" />
      </Statistics>
      {/* todo: real pagination */}
      <Table bordered={true} paginated={true} pageCount="5">
        <TableHead>
          <TableRow>
            <TableHeader>App</TableHeader>
            <TableHeader>Action</TableHeader>
            <TableHeader>Occurred At</TableHeader>
            <TableHeader>Email</TableHeader>
            <TableHeader>Name</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {events.map((event) => (
            <TableRow>
              <TableCell>{event.app}</TableCell>
              <TableCell>{event.type}</TableCell>
              <TableCell>{new Date(event.occurredAt).toString()}</TableCell>
              <TableCell>{event.email}</TableCell>
              <TableCell>{event.firstname + " " + event.lastname}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
};
